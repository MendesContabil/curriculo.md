import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useBranding } from '../theme.jsx';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Spinner,
  formatDate,
  formatDateTime,
  useToast,
} from '../components/ui.jsx';
import { IconMessage, IconSend, IconShield } from '../components/icons.jsx';

const NOTICE = {
  hours:
    'Horário de resposta: segunda a sexta, das 8h às 20h; sábados, das 8h às 12h. Mensagens fora desse horário são respondidas no próximo dia útil.',
  emergency:
    'Este canal não substitui atendimento de emergência. Em crise, ligue 188 (CVV) ou 192 (SAMU).',
};

function ChatNotice() {
  return (
    <div className="chat-notice" role="note">
      <span className="chat-notice-icon">
        <IconShield width={20} height={20} />
      </span>
      <div>
        <strong>Canal interno entre psicóloga e paciente</strong>
        <p>{NOTICE.hours}</p>
        <p className="chat-notice-emergency">{NOTICE.emergency}</p>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const loadConversations = async (preferredId = null) => {
    const data = await api.get('/api/chat');
    setConversations(data.conversations || []);
    const current = preferredId ?? selectedRef.current;
    const exists = (data.conversations || []).some((c) => c.patientId === current);
    if (!exists && data.conversations?.length) {
      setSelectedId(data.conversations[0].patientId);
    }
  };

  const loadThread = async (patientId) => {
    const path = isAdmin
      ? `/api/chat${patientId ? `?patientId=${patientId}` : ''}`
      : '/api/chat';
    const data = await api.get(path);
    setThread(data);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const ready = isAdmin
      ? loadConversations().then(() => {
          if (active && !selectedRef.current) {
            // loadConversations selects the first conversation
          }
        })
      : null;
    (ready || loadThread())
      .catch((err) => toast(err.message, 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedId) return;
    let active = true;
    loadThread(selectedId)
      .catch((err) => active && toast(err.message, 'error'));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isAdmin) {
        loadConversations().catch(() => {});
        if (selectedRef.current) loadThread(selectedRef.current).catch(() => {});
      } else {
        loadThread().catch(() => {});
      }
    }, 9000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread?.messages?.length]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (isAdmin && !selectedId) {
      toast('Selecione um paciente para conversar.', 'error');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/chat', isAdmin ? { patientId: selectedId, body } : { body });
      setText('');
      await loadThread(isAdmin ? selectedId : undefined);
      if (isAdmin) await loadConversations(selectedId);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner label="Abrindo o chat" />;

  const selectedConversation = conversations.find((c) => c.patientId === selectedId);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Canal interno</p>
          <h1>Chat</h1>
          <p className="page-sub">
            {isAdmin
              ? 'Converse com seus pacientes entre as sessões.'
              : `Converse com ${branding.clinicName || 'sua psicóloga'} entre as sessões.`}
          </p>
        </div>
      </header>

      <ChatNotice />

      {isAdmin ? (
        <div className="chat-layout">
          <Card className="chat-side">
            <div className="panel-head">
              <div>
                <h2>Conversas</h2>
                <p>{conversations.length} paciente(s)</p>
              </div>
            </div>
            {conversations.length === 0 ? (
              <EmptyState
                icon={<IconMessage />}
                title="Nenhum paciente"
                description="Cadastre um paciente para iniciar uma conversa."
              />
            ) : (
              <ul className="chat-conversations">
                {conversations.map((conversation) => (
                  <li key={conversation.patientId}>
                    <button
                      type="button"
                      className={`chat-conversation ${
                        conversation.patientId === selectedId ? 'chat-conversation-active' : ''
                      }`}
                      onClick={() => setSelectedId(conversation.patientId)}
                    >
                      <Avatar name={conversation.patientName} size="sm" />
                      <span className="chat-conversation-text">
                        <strong>{conversation.patientName}</strong>
                        <span>
                          {conversation.lastMessage ||
                            'Nenhuma mensagem ainda — comece a conversa.'}
                        </span>
                      </span>
                      {conversation.lastAt && (
                        <span className="chat-conversation-time">
                          {formatDate(conversation.lastAt)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="chat-panel">
            {!selectedId ? (
              <EmptyState
                icon={<IconMessage />}
                title="Selecione uma conversa"
                description="Escolha um paciente na lista para ver as mensagens."
              />
            ) : (
              <ChatThread
                title={selectedConversation?.patientName || thread?.patient?.name || 'Paciente'}
                subtitle={selectedConversation?.patientPhone || thread?.patient?.phone || ''}
                thread={thread}
                text={text}
                setText={setText}
                onSend={send}
                sending={sending}
                isAdmin={isAdmin}
                bottomRef={bottomRef}
              />
            )}
          </Card>
        </div>
      ) : (
        <Card className="chat-panel">
          <ChatThread
            title={`Conversa com ${branding.clinicName || 'a psicóloga'}`}
            subtitle="Mensagens ficam salvas na sua área."
            thread={thread}
            text={text}
            setText={setText}
            onSend={send}
            sending={sending}
            isAdmin={isAdmin}
            bottomRef={bottomRef}
          />
        </Card>
      )}
    </div>
  );
}

function ChatThread({ title, subtitle, thread, text, setText, onSend, sending, isAdmin, bottomRef }) {
  const messages = thread?.messages || [];
  return (
    <div className="chat-thread">
      <header className="chat-thread-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <IconMessage width={26} height={26} />
            <p>Nenhuma mensagem ainda. Escreva a primeira mensagem abaixo.</p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = isAdmin ? message.senderRole === 'admin' : message.senderRole === 'patient';
            return (
              <div
                key={message.id}
                className={`chat-bubble-row ${mine ? 'chat-bubble-row-mine' : ''}`}
              >
                <div className={`chat-bubble ${mine ? 'chat-bubble-mine' : 'chat-bubble-other'}`}>
                  <p>{message.body}</p>
                  <span>
                    {message.senderName ? `${message.senderName} · ` : ''}
                    {formatDateTime(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-composer" onSubmit={onSend}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escreva uma mensagem…"
          maxLength={4000}
          aria-label="Mensagem"
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          <IconSend width={17} height={17} /> {sending ? 'Enviando…' : 'Enviar'}
        </Button>
      </form>
    </div>
  );
}
