-- ===== CONVERSATION SCHEMA =====
-- Stores WhatsApp (or any channel) conversation sessions and messages.
-- Used by the n8n workflow to maintain state across messages.

CREATE SCHEMA IF NOT EXISTS conversation;

-- ===== SESSIONS =====
-- One row per WhatsApp phone number (or channel user).
-- context_json holds the accumulated data collected during the conversation
-- (lead info, energy data, installation details, missing fields, etc.)
CREATE TABLE conversation.conversation_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      VARCHAR(255) NOT NULL UNIQUE,  -- e.g. 'whatsapp:5511999999999'
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel         VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  channel_user_id VARCHAR(255) NOT NULL,
  context_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_sessions_session_id  ON conversation.conversation_sessions(session_id);
CREATE INDEX idx_conv_sessions_tenant_id   ON conversation.conversation_sessions(tenant_id);
CREATE INDEX idx_conv_sessions_channel_user ON conversation.conversation_sessions(channel, channel_user_id);

-- ===== MESSAGES =====
-- Every inbound and outbound message, linked to a session.
CREATE TABLE conversation.conversation_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   VARCHAR(255) NOT NULL
                 REFERENCES conversation.conversation_sessions(session_id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  direction    VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_messages_session_id ON conversation.conversation_messages(session_id);
CREATE INDEX idx_conv_messages_tenant_id  ON conversation.conversation_messages(tenant_id);
CREATE INDEX idx_conv_messages_created_at ON conversation.conversation_messages(created_at DESC);
