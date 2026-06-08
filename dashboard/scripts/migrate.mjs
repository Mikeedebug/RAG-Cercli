import { createClient } from '@supabase/supabase-js'

const url = 'https://vtehjmzgytlojnxjlhgu.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZWhqbXpneXRsb2pueGpsaGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTQ1NTgsImV4cCI6MjA5NjQ5MDU1OH0.P9jM5-AIo1SKqehPLrF3vUJ88xAJHw0bkKtgZn7T0Dk'

const supabase = createClient(url, key)

// Test connection
const { data, error } = await supabase.from('feature_requests').select('count').limit(1)
if (error) {
  console.log('Tables may not exist yet:', error.message)
} else {
  console.log('Connected! feature_requests table exists. Count:', data)
}
