import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(key)
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Omni <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  try {
    // Verify the request has a valid OIDC token
    // The token is a JWT from our OIDC provider — validate its structure
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    // JWT must have 3 parts separated by dots and be of reasonable length
    const jwtParts = token.split('.')
    if (jwtParts.length !== 3 || token.length < 100) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    // Decode payload and check expiry
    try {
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString())
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 })
      }
      if (!payload.sub) {
        return NextResponse.json({ error: 'Invalid token claims' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Malformed token' }, { status: 401 })
    }

    const resend = getResend()
    const { type, email, orgName, inviteCode, inviterName } = await req.json()

    if (!email || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    if (type === 'invite-link') {
      // Send invite link email
      if (!inviteCode) {
        return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })
      }

      const inviteUrl = `${origin}/invite/${inviteCode}`

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `You're invited to join ${orgName} on Omni`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 20px;">O</span>
              </div>
            </div>
            <h1 style="font-size: 22px; font-weight: 600; color: #111; margin-bottom: 8px; text-align: center;">
              Join ${orgName} on Omni
            </h1>
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 32px;">
              ${inviterName ? `${inviterName} has` : 'You have been'} invited you to collaborate on Omni, the AI-powered workspace platform.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                Accept Invite
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              Or copy this link: <br/>
              <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 11px; word-break: break-all;">${inviteUrl}</code>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #bbb; font-size: 11px; text-align: center;">
              Sent by Omni &middot; Powered by SpacetimeDB
            </p>
          </div>
        `,
      })

      if (error) {
        console.error('[Omni] Resend error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, id: data?.id })
    }

    if (type === 'invite-email') {
      // Direct email invite (no code, just notification)
      const joinUrl = `${origin}/setup`

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `You're invited to join ${orgName} on Omni`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 20px;">O</span>
              </div>
            </div>
            <h1 style="font-size: 22px; font-weight: 600; color: #111; margin-bottom: 8px; text-align: center;">
              Join ${orgName} on Omni
            </h1>
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 32px;">
              ${inviterName ? `${inviterName} has` : 'You have been'} invited you to join <strong>${orgName}</strong> on Omni. Sign in with your <strong>${email}</strong> account to get started.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${joinUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                Get Started
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              Sign in with your ${email} account to be automatically added to ${orgName}.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #bbb; font-size: 11px; text-align: center;">
              Sent by Omni &middot; Powered by SpacetimeDB
            </p>
          </div>
        `,
      })

      if (error) {
        console.error('[Omni] Resend error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, id: data?.id })
    }

    return NextResponse.json({ error: 'Invalid invite type' }, { status: 400 })
  } catch (err: any) {
    console.error('[Omni] Invite email error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
