import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Mic, Video, PhoneOff, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { joinChannel, publishTracks, subscribeRemote, leaveSession, AgoraSession } from '@/integrations/agora/client';

const APP_ID = 'f75cc07f86f04b38b7da5346c072f40d';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const consultationId = searchParams.get('consultationId') || '';
  const doctorId = searchParams.get('doctorId') || '';

  const [sessionId, setSessionId] = useState<string>('');
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [status, setStatus] = useState<'queued'|'active'|'ended'|'offline'|'closed'|'loading'>('loading');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const agoraRef = useRef<AgoraSession | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      if (!consultationId || !doctorId) { navigate('/doctors'); return; }

      const { data, error } = await supabase.rpc('request_chat', { _doctor_id: doctorId, _consultation_id: consultationId });
      if (error) {
        setStatus('closed');
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setSessionId(row?.session_id || '');
        setQueuePos(row?.position ?? null);
        setStatus(row?.status || 'queued');
      }
      setLoading(false);
    })();
  }, [consultationId, doctorId, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel('chat:'+sessionId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    (async () => {
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at');
      setMessages(data || []);
    })();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const startRtc = async (withAudio: boolean, withVideo: boolean) => {
    if (status !== 'active') return;
    if (agoraRef.current) return;

    const channelName = sessionId;
    const { client } = await joinChannel(APP_ID, channelName, null);
    const { microphoneTrack, cameraTrack } = await publishTracks(client, withAudio, withVideo);

    if (cameraTrack && localVideoRef.current) {
      cameraTrack.play(localVideoRef.current);
    }

    subscribeRemote(client, (user, mediaType) => {
      if (mediaType === 'video' && remoteVideoRef.current) {
        const track = user.videoTrack;
        track?.play(remoteVideoRef.current);
      }
      if (mediaType === 'audio') {
        const track = user.audioTrack as any;
        track?.play();
      }
    });

    agoraRef.current = { client, localAudio: microphoneTrack || undefined, localVideo: cameraTrack || undefined, joined: true };
  };

  const stopRtc = async () => {
    if (!agoraRef.current) return;
    await leaveSession(agoraRef.current);
    agoraRef.current = null;
  };

  const sendMessage = async (type: 'text'|'image') => {
    if (!sessionId) return;
    if (type === 'text' && !text.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: user!.id,
        role: 'user',
        type,
        content: type === 'text' ? text.trim() : null,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    const path = `${sessionId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('chat-uploads').upload(path, file);
    if (!error) {
      const url = supabase.storage.from('chat-uploads').getPublicUrl(data.path).data.publicUrl;
      await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', type: 'image', attachment_url: url, sender_id: (await supabase.auth.getUser()).data.user!.id });
    }
    e.currentTarget.value = '';
  };

  const active = status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>رجوع</Button>
          <div className="text-sm text-muted-foreground">
            {status === 'queued' && (queuePos ? `قيد الانتظار • الدور ${queuePos}` : 'قيد الانتظار')}
            {status === 'active' && 'متصل'}
            {status === 'offline' && 'الطبيب غير متصل'}
          </div>
        </div>

        <Card className="mb-3">
          <CardContent className="p-0">
            <div className="h-[260px] grid grid-cols-2 gap-1 bg-black">
              <div ref={localVideoRef} className="bg-black" />
              <div ref={remoteVideoRef} className="bg-black" />
            </div>
            <div className="flex gap-2 p-3 border-t">
              <Button size="sm" onClick={() => startRtc(true, false)} disabled={!active}><Mic className="w-4 h-4 ml-1"/>صوت</Button>
              <Button size="sm" onClick={() => startRtc(true, true)} disabled={!active}><Video className="w-4 h-4 ml-1"/>فيديو</Button>
              <Button size="sm" variant="destructive" onClick={stopRtc}><PhoneOff className="w-4 h-4 ml-1"/>إنهاء</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="h-72 overflow-y-auto p-3 space-y-2 bg-background">
              {loading && <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin ml-2"/>تحميل...</div>}
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] ${m.role==='user' ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-secondary'} rounded-2xl px-3 py-2` }>
                  {m.type === 'text' && <div className="whitespace-pre-wrap leading-6 text-sm">{m.content}</div>}
                  {m.type === 'image' && <img src={m.attachment_url} className="rounded-lg max-h-60" />}
                </div>
              ))}
            </div>
            <div className="p-3 flex items-center gap-2 border-t">
              <label className="cursor-pointer inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-foreground">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <ImageIcon className="w-5 h-5" />
              </label>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك..." className="text-right" onKeyDown={(e)=>{ if(e.key==='Enter'){ sendMessage('text'); } }} />
              <Button onClick={() => sendMessage('text')} disabled={sending || !text.trim()}>{sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
