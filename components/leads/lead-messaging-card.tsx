"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Lead } from "@/lib/api/leads";
import { MessageChannel, MessagingStatus, getMessagingStatus, sendLeadMessage } from "@/lib/api/assistant";
import { telLink, whatsappLink } from "@/lib/contact-links";

interface Props {
  lead: Lead;
  onChanged: () => void;
}

/** SMS and WhatsApp to a lead, logged on the timeline. Call and WhatsApp links work without any setup. */
export function LeadMessagingCard({ lead, onChanged }: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<MessagingStatus | null>(null);
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getMessagingStatus()
      .then((s) => {
        setStatus(s);
        if (!s.whatsapp && s.sms) setChannel("sms");
      })
      .catch(() => setStatus({ sms: false, whatsapp: false }));
  }, []);

  const tel = telLink(lead.phone);
  const wa = whatsappLink(lead.phone);
  const anyChannel = !!status && (status.sms || status.whatsapp);
  const chosenEnabled = status ? status[channel] : false;

  const send = async () => {
    setSending(true);
    try {
      await sendLeadMessage(lead.id, channel, body.trim());
      setBody("");
      toast({ title: channel === "sms" ? "SMS sent" : "WhatsApp sent", description: "Logged on the timeline." });
      onChanged();
    } catch (e) {
      toast({ title: "Message not sent", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tel ? (
            <Button asChild size="sm" variant="outline"><a href={tel}><Phone className="mr-2 size-4" />Call</a></Button>
          ) : (
            <Button size="sm" variant="outline" disabled>No phone number</Button>
          )}
          {wa && (
            <Button asChild size="sm" variant="outline">
              <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp (opens app)</a>
            </Button>
          )}
        </div>

        {status === null ? (
          <p className="text-sm text-muted-foreground">Checking messaging…</p>
        ) : !anyChannel ? (
          <p className="text-sm text-muted-foreground">
            SMS and WhatsApp sending is not set up for this workspace yet. Calls and the WhatsApp link still work.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1">
                <Label className="text-xs">Send as</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp" disabled={!status.whatsapp}>WhatsApp</SelectItem>
                    <SelectItem value="sms" disabled={!status.sms}>SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a short message" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{body.length}/1000</span>
              <Button size="sm" onClick={send} disabled={sending || !chosenEnabled || !body.trim() || !lead.phone}>
                {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
