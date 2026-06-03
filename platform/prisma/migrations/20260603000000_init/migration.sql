-- CreateEnum
CREATE TYPE "LinkedAccountStatus" AS ENUM ('active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('pending', 'processing', 'processed', 'failed', 'dead_letter');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('pending', 'active', 'inactive', 'terminated');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'interview', 'offer', 'offer_accepted', 'hired', 'rejected');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('pending', 'in_progress', 'complete', 'blocked');

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "credentials_ref" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "LinkedAccountStatus" NOT NULL DEFAULT 'active',
    "webhook_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalCandidate" (
    "id" TEXT NOT NULL,
    "remote_id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "location" TEXT,
    "remote_data" JSONB NOT NULL DEFAULT '{}',
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalApplication" (
    "id" TEXT NOT NULL,
    "remote_id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "job_title" TEXT,
    "job_id" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "applied_at" TIMESTAMP(3),
    "stage" TEXT,
    "work_location" TEXT,
    "remote_data" JSONB NOT NULL DEFAULT '{}',
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalEmployee" (
    "id" TEXT NOT NULL,
    "remote_id" TEXT,
    "linked_account_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "work_location" TEXT,
    "job_title" TEXT,
    "department" TEXT,
    "start_date" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'pending',
    "remote_data" JSONB NOT NULL DEFAULT '{}',
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "vendor_event_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processed_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "field_mapping" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RightToWorkChecklist" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RightToWorkChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "cost_usd" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkedAccount_customer_id_idx" ON "LinkedAccount"("customer_id");

-- CreateIndex
CREATE INDEX "LinkedAccount_vendor_customer_id_idx" ON "LinkedAccount"("vendor", "customer_id");

-- CreateIndex
CREATE INDEX "CanonicalCandidate_customer_id_idx" ON "CanonicalCandidate"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalCandidate_linked_account_id_remote_id_key" ON "CanonicalCandidate"("linked_account_id", "remote_id");

-- CreateIndex
CREATE INDEX "CanonicalApplication_customer_id_idx" ON "CanonicalApplication"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalApplication_linked_account_id_remote_id_key" ON "CanonicalApplication"("linked_account_id", "remote_id");

-- CreateIndex
CREATE INDEX "CanonicalEmployee_customer_id_idx" ON "CanonicalEmployee"("customer_id");

-- CreateIndex
CREATE INDEX "CanonicalEmployee_linked_account_id_idx" ON "CanonicalEmployee"("linked_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Event_idempotency_key_key" ON "Event"("idempotency_key");

-- CreateIndex
CREATE INDEX "Event_customer_id_idx" ON "Event"("customer_id");

-- CreateIndex
CREATE INDEX "Event_linked_account_id_status_idx" ON "Event"("linked_account_id", "status");

-- CreateIndex
CREATE INDEX "Workflow_customer_id_trigger_idx" ON "Workflow"("customer_id", "trigger");

-- CreateIndex
CREATE INDEX "RightToWorkChecklist_customer_id_idx" ON "RightToWorkChecklist"("customer_id");

-- CreateIndex
CREATE INDEX "RightToWorkChecklist_employee_id_idx" ON "RightToWorkChecklist"("employee_id");

-- CreateIndex
CREATE INDEX "AuditLog_customer_id_idx" ON "AuditLog"("customer_id");

-- CreateIndex
CREATE INDEX "AuditLog_resource_type_resource_id_idx" ON "AuditLog"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "AiCallLog_customer_id_idx" ON "AiCallLog"("customer_id");

-- AddForeignKey
ALTER TABLE "CanonicalCandidate" ADD CONSTRAINT "CanonicalCandidate_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "LinkedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanonicalApplication" ADD CONSTRAINT "CanonicalApplication_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "LinkedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanonicalApplication" ADD CONSTRAINT "CanonicalApplication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "CanonicalCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanonicalEmployee" ADD CONSTRAINT "CanonicalEmployee_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "LinkedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "LinkedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RightToWorkChecklist" ADD CONSTRAINT "RightToWorkChecklist_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "CanonicalEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

