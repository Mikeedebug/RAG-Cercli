import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { account_name, feature_request_title, priority, estimated_release, comments } = body

  if (!account_name || !feature_request_title) {
    return NextResponse.json({ error: 'account_name and feature_request_title required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (priority !== undefined) updates.priority = priority
  if (estimated_release !== undefined) updates.estimated_release = estimated_release
  if (comments !== undefined) updates.comments = comments

  const { data, error } = await supabase
    .from('account_fr_meta')
    .upsert({ account_name, feature_request_title, ...updates }, { onConflict: 'account_name,feature_request_title' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
