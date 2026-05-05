import { useState, useEffect } from "react";
import { useGetConversations, useGetMessages, useSendMessage, useStartConversation, useSearchUsers, getGetConversationsQueryKey, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { MessageCircle, Send, Plus, Loader2, Search, Trash2, Pencil, Check, X, AlertTriangle, MoreVertical } from "lucide-react";

function ConversationList({ onSelect, selected, onDelete }: { onSelect: (id: string) => void; selected: string | null; onDelete: (id: string) => void }) {
  const { data: conversations, isLoading } = useGetConversations();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!conversations?.length) return (
    <div className="text-center p-8 text-muted-foreground">
      <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">No messages yet</p>
    </div>
  );
  return (
    <div className="divide-y divide-border">
      {conversations.map(c => {
        const other = (c as any).participants?.[0];
        const isConfirming = confirmDeleteId === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => { setHoveredId(null); if (!isConfirming) setConfirmDeleteId(null); }}
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors relative ${selected === c.id ? "bg-primary/10 border-r-2 border-primary" : ""}`}
          >
            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden flex-shrink-0">
              {other?.avatarUrl ? (
                <img src={other.avatarUrl} alt={other.displayName} className="w-full h-full object-cover" />
              ) : (
                (other?.displayName || "?").slice(0, 1)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">{other?.displayName || "Unknown"}</div>
              <div className="text-xs text-muted-foreground truncate">{(c as any).lastMessage || "No messages"}</div>
            </div>
            {(hoveredId === c.id || isConfirming) && (
              <button
                onClick={(e) => handleDeleteClick(e, c.id)}
                title={isConfirming ? "Confirm delete thread" : "Delete thread"}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                  isConfirming
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                    : "bg-muted/80 text-muted-foreground hover:text-red-400 border border-border hover:border-red-500/40"
                }`}
              >
                {isConfirming ? <AlertTriangle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatWindow({ conversationId, currentUserId, participantName, participantAvatar, onDeleteThread }: {
  conversationId: string;
  currentUserId?: string;
  participantName?: string;
  participantAvatar?: string;
  onDeleteThread?: () => void;
}) {
  const [text, setText] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgContent, setEditMsgContent] = useState("");
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [showThreadActions, setShowThreadActions] = useState(false);
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
  const qc = useQueryClient();
  const { data: messages, isLoading } = useGetMessages(conversationId);
  const sendMessage = useSendMessage();

  useEffect(() => {
    fetch(`/api/messages/${conversationId}/read`, { method: "POST", credentials: "include" })
      .then(() => { qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() }); })
      .catch(() => {});
  }, [conversationId]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate(
      { conversationId, data: { content: text } },
      { onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) }); qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() }); } }
    );
  };

  const handleDeleteMsg = async (msgId: string) => {
    setDeletingMsgId(msgId);
    try {
      await fetch(`/api/messages/${msgId}`, { method: "DELETE", credentials: "include" });
      qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) });
      qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    } catch {} finally { setDeletingMsgId(null); }
  };

  const handleSaveEditMsg = async (msgId: string) => {
    if (!editMsgContent.trim()) return;
    try {
      await fetch(`/api/messages/${msgId}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editMsgContent }) });
      qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) });
    } catch {} finally { setEditingMsgId(null); }
  };

  const handleDeleteThread = async () => {
    if (!confirmDeleteThread) {
      setConfirmDeleteThread(true);
      setTimeout(() => setConfirmDeleteThread(false), 4000);
      return;
    }
    setDeletingThread(true);
    try {
      await fetch(`/api/messages/conversations/${conversationId}`, { method: "DELETE", credentials: "include" });
      qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      onDeleteThread?.();
    } catch {} finally { setDeletingThread(false); setConfirmDeleteThread(false); }
  };

  if (isLoading) return <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
          {participantAvatar ? (
            <img src={participantAvatar} alt={participantName} className="w-full h-full object-cover" />
          ) : (
            (participantName || "?").slice(0, 1)
          )}
        </div>
        <span className="flex-1 font-medium text-sm text-foreground truncate">{participantName || "Conversation"}</span>
        <div className="relative">
          <button
            onClick={() => { setShowThreadActions(p => !p); setConfirmDeleteThread(false); }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showThreadActions && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-30 min-w-[180px] overflow-hidden">
              <button
                onClick={handleDeleteThread}
                disabled={deletingThread}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors ${
                  confirmDeleteThread
                    ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                    : "text-muted-foreground hover:text-red-400 hover:bg-muted"
                }`}
              >
                {deletingThread ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : confirmDeleteThread ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deletingThread ? "Deleting..." : confirmDeleteThread ? "Confirm delete thread" : "Delete entire thread"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => setShowThreadActions(false)}>
        {messages?.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">No messages yet. Say something.</div>
        )}
        {messages?.map(m => {
          const isMine = m.senderId === currentUserId;
          const isDeleted = m.content === "🗑️ This message was deleted";
          return (
            <div
              key={m.id}
              className={`flex items-end gap-1 ${isMine ? "justify-end" : "justify-start"}`}
              onMouseEnter={() => setHoveredMsg(m.id)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              {isMine && !isDeleted && hoveredMsg === m.id && editingMsgId !== m.id && (
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() => { setEditingMsgId(m.id); setEditMsgContent(m.content || ""); }}
                    className="p-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-blue-400 hover:border-blue-400/40 transition-colors"
                    title="Edit message"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteMsg(m.id)}
                    disabled={deletingMsgId === m.id}
                    className="p-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors"
                    title="Delete message"
                  >
                    {deletingMsgId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              )}

              <div className={`max-w-xs rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${isDeleted ? "opacity-40 italic" : ""}`}>
                {editingMsgId === m.id ? (
                  <div className="p-2">
                    <textarea
                      value={editMsgContent}
                      onChange={e => setEditMsgContent(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full bg-black/30 rounded-lg px-2 py-1 text-sm text-primary-foreground resize-none focus:outline-none border border-white/20"
                    />
                    <div className="flex gap-1 mt-1.5 justify-end">
                      <button onClick={() => handleSaveEditMsg(m.id)} className="p-1 rounded bg-white/20 hover:bg-white/30"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setEditingMsgId(null)} className="p-1 rounded bg-white/10 hover:bg-white/20"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <span>{m.content}</span>
                    <div className={`text-xs mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <button onClick={handleSend} disabled={!text.trim()} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-accent disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Messages() {
  useSEO({
    title: "Messages",
    description: "Private messages on CLAW — direct, honest conversations.",
    canonical: "/messages",
    noIndex: true,
  });
  const { user } = useAuth();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const qc = useQueryClient();
  const { data: conversations } = useGetConversations();
  const { data: searchResults } = useSearchUsers({ q: searchQ }, { query: { enabled: searchQ.length > 1, queryKey: ["search-users", searchQ] } });
  const startConversation = useStartConversation();

  const selectedConvData = selectedConv ? conversations?.find(c => c.id === selectedConv) : null;
  const participantInfo = selectedConvData ? (selectedConvData as any).participants?.[0] : null;

  const handleStartNew = (targetUserId: string) => {
    startConversation.mutate(
      { data: { targetUserId } },
      {
        onSuccess: (conv) => {
          setSelectedConv(conv.id);
          setShowNewConv(false);
          setSearchQ("");
          qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        }
      }
    );
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/messages/conversations/${convId}`, { method: "DELETE", credentials: "include" });
      qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      if (selectedConv === convId) setSelectedConv(null);
    } catch {}
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col lg:flex-row border border-border rounded-xl overflow-hidden m-4 bg-card">
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-serif font-bold text-foreground">Messages</h3>
            <button onClick={() => setShowNewConv(!showNewConv)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {showNewConv && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              {searchResults && searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {searchResults.map(u => (
                    <button key={u.id} onClick={() => handleStartNew(u.id)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left">
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold overflow-hidden">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" /> : u.displayName.slice(0, 1)}
                      </div>
                      <span className="text-sm text-foreground">{u.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              onSelect={setSelectedConv}
              selected={selectedConv}
              onDelete={handleDeleteConversation}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {selectedConv ? (
            <ChatWindow
              conversationId={selectedConv}
              currentUserId={user?.id}
              participantName={participantInfo?.displayName}
              participantAvatar={participantInfo?.avatarUrl}
              onDeleteThread={() => setSelectedConv(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-serif">Select a conversation</p>
                <p className="text-sm mt-1">Or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
