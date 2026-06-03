import { Injectable, Logger } from '@nestjs/common';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface RetryConfig {
  retries?: number;
  retryDelay?: number;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  create(baseURL: string, headers?: Record<string, string>, retry?: RetryConfig): AxiosInstance {
    const instance = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 30000,
    });

    const maxRetries = retry?.retries ?? 3;
    const retryDelay = retry?.retryDelay ?? 1000;

    instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: unknown) => {
        const axiosError = error as {
          config?: InternalAxiosRequestConfig & { _retryCount?: number };
          response?: { status: number };
        };
        const config = axiosError.config;
        if (!config) return Promise.reject(error);

        config._retryCount = config._retryCount ?? 0;
        const status = axiosError.response?.status;
        const isRetryable =
          !status || status >= 500 || status === 429 || status === 408;

        if (config._retryCount < maxRetries && isRetryable) {
          config._retryCount++;
          const delay = retryDelay * Math.pow(2, config._retryCount - 1);
          this.logger.warn(
            `Retrying request (attempt ${config._retryCount}/${maxRetries}) after ${delay}ms`,
          );
          await new Promise((res) => setTimeout(res, delay));
          return instance.request(config);
        }

        return Promise.reject(error);
      },
    );

    return instance;
  }
}
