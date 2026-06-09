"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, X, UserPlus, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Participant = {
  id: string;
  name: string;
  isUser: boolean;
  familyMembers: string[];
};

export default function CreateTrip() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "p1", name: "Marco (You)", isUser: true, familyMembers: [] }
  ]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeFamilyMemberInput, setActiveFamilyMemberInput] = useState<string | null>(null);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState("");

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newP: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newParticipantName.trim(),
      isUser: false,
      familyMembers: []
    };
    setParticipants([...participants, newP]);
    setNewParticipantName("");
  };

  const removeParticipant = (id: string) => {
    if (id === "p1") return; // Keep self
    setParticipants(participants.filter(p => p.id !== id));
  };

  const addFamilyMember = (participantId: string) => {
    if (!newFamilyMemberName.trim()) return;
    setParticipants(participants.map(p => {
      if (p.id === participantId) {
        // Avoid duplicate names in the same family
        if (p.familyMembers.includes(newFamilyMemberName.trim())) return p;
        return { ...p, familyMembers: [...p.familyMembers, newFamilyMemberName.trim()] };
      }
      return p;
    }));
    setNewFamilyMemberName("");
    setActiveFamilyMemberInput(null);
  };

  const removeFamilyMember = (participantId: string, memberName: string) => {
    setParticipants(participants.map(p => {
      if (p.id === participantId) {
        return { ...p, familyMembers: p.familyMembers.filter(m => m !== memberName) };
      }
      return p;
    }));
  };

  const handleSaveTrip = () => {
    // Validation: Trip name and at least one other participant required
    if (!name.trim() || participants.length < 2) return;
    router.push("/");
  };

  const isTripValid = name.trim().length > 0 && participants.length >= 2;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-24">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Create New Trip</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-safe-pad py-8 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Trip Name</Label>
          <Input 
            placeholder="e.g. Goa 2024, Europe Tour" 
            className="h-14 text-lg rounded-2xl focus-visible:ring-primary shadow-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Friends & Families</Label>
            <span className="text-[10px] text-primary font-bold">{participants.length} people added</span>
          </div>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Who's coming with you?" 
              className="h-12 rounded-xl shadow-sm"
              value={newParticipantName}
              onChange={e => setNewParticipantName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
            />
            <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={addParticipant}>
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>

          <Alert className="bg-primary/10 border-primary/30 rounded-2xl py-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <AlertDescription className="text-xs text-foreground/80 font-medium leading-relaxed">
              Traveling with others? Add their names! This helps Travex split costs perfectly by individual person or family later.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            {participants.map((p) => (
              <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {p.name[0]}
                      </div>
                      <span className="font-bold">{p.name}</span>
                    </div>
                    {p.id !== "p1" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeParticipant(p.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="pl-13 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {p.familyMembers.map((fm) => (
                        <Badge key={fm} variant="secondary" className="pl-3 pr-1 py-1 rounded-full flex items-center gap-1 bg-muted/50 border-none group">
                          <span className="text-[10px] font-medium">{fm}</span>
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFamilyMember(p.id, fm)} />
                        </Badge>
                      ))}
                      {activeFamilyMemberInput === p.id ? (
                        <div className="flex gap-1 w-full mt-2 animate-in fade-in slide-in-from-top-1">
                          <Input 
                            autoFocus
                            placeholder="Add member name..." 
                            className="h-8 text-xs rounded-lg"
                            value={newFamilyMemberName}
                            onChange={e => setNewFamilyMemberName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addFamilyMember(p.id)}
                            onBlur={() => {
                              if (!newFamilyMemberName.trim()) setActiveFamilyMemberInput(null);
                            }}
                          />
                          <Button size="sm" className="h-8 px-3 rounded-lg bg-primary" onClick={() => addFamilyMember(p.id)}>Add</Button>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] font-bold uppercase text-primary hover:bg-primary/5 p-0 px-2"
                          onClick={() => setActiveFamilyMemberInput(p.id)}
                        >
                          + Add Family Member
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-safe-pad bg-white border-t z-20">
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          onClick={handleSaveTrip}
          disabled={!isTripValid}
        >
          <Save className="mr-2 h-5 w-5" />
          Create Trip Group
        </Button>
        {!isTripValid && name.trim() && participants.length < 2 && (
          <p className="text-[10px] text-destructive text-center mt-2 font-medium">Add at least one friend to start</p>
        )}
      </footer>
    </div>
  );
}
