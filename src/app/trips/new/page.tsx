
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UserPlus, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type Participant = {
  id: string;
  name: string;
  isUser: boolean;
  avatar: string;
  familyMembers: string[];
};

export default function CreateTrip() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "p1", name: "Marco (You)", isUser: true, avatar: "https://picsum.photos/seed/user1/50/50", familyMembers: [] }
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
      avatar: `https://picsum.photos/seed/${Math.random()}/50/50`,
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

  const handleSaveTrip = async () => {
    if (!name.trim()) {
      toast({
        title: "Missing trip name",
        description: "Please give your trip a name to continue.",
        variant: "destructive"
      });
      return;
    }

    if (participants.length < 2) {
      toast({
        title: "Missing friends",
        description: "Add at least one friend to split expenses with.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const tripRef = collection(db, "trips");
      await addDoc(tripRef, {
        name: name.trim(),
        participants: participants,
        createdAt: serverTimestamp(),
        status: "Active",
        totalSpent: 0,
        yourBalance: 0,
        image: `https://picsum.photos/seed/${Math.random()}/600/400`
      });

      toast({
        title: "Trip created!",
        description: `${name} has been set up successfully.`,
      });
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col pb-24">
      <header className="px-safe-pad py-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Create new trip</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-safe-pad py-8 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <Label className="text-sm font-bold text-muted-foreground ml-1">Trip name</Label>
          <Input 
            placeholder="e.g. Goa 2024, Europe tour" 
            className="h-14 text-lg rounded-2xl focus-visible:ring-primary shadow-sm bg-white"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <Label className="text-sm font-bold text-muted-foreground ml-1">Friends & families</Label>
            <span className="text-[10px] text-primary font-bold">{participants.length} groups added</span>
          </div>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Who's coming with you?" 
              className="h-12 rounded-xl shadow-sm bg-white"
              value={newParticipantName}
              onChange={e => setNewParticipantName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
            />
            <Button size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary" onClick={addParticipant}>
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>

          <Alert className="bg-primary/10 border-primary/30 rounded-2xl py-3 shadow-sm">
            <Lightbulb className="h-5 w-5 text-foreground/80" />
            <AlertDescription className="text-xs text-foreground/80 font-medium leading-relaxed">
              Traveling with others? Add their names! This helps Travex split costs perfectly by individual person or family later.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            {participants.map((p) => {
              const headName = p.name.replace(" (You)", "");
              return (
                <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.avatar} />
                        </Avatar>
                        <span className="font-bold text-sm tracking-tight">{headName}&apos;s family</span>
                      </div>
                      {p.id !== "p1" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeParticipant(p.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge 
                          variant="outline" 
                          className="px-3 py-1.5 rounded-full flex items-center gap-2 bg-primary/5 border-primary/30 text-primary font-bold shadow-sm"
                        >
                          <span className="text-[10px] font-bold">{headName}</span>
                        </Badge>

                        {p.familyMembers.map((fm) => (
                          <Badge 
                            key={fm} 
                            variant="outline" 
                            className="pl-3 pr-2 py-1.5 rounded-full flex items-center gap-2 bg-white border-primary/30 text-primary font-bold shadow-sm group animate-in zoom-in-95 duration-200"
                          >
                            <span className="text-[10px] font-bold">{fm}</span>
                            <X 
                              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors" 
                              onClick={() => removeFamilyMember(p.id, fm)} 
                            />
                          </Badge>
                        ))}
                        
                        {activeFamilyMemberInput === p.id ? (
                          <div className="flex gap-1 items-center w-full sm:w-auto animate-in fade-in slide-in-from-top-1">
                            <Input 
                              autoFocus
                              placeholder="Name..." 
                              className="h-8 text-xs rounded-lg bg-white w-24 sm:w-32"
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
                            className="h-7 text-[10px] font-bold text-primary hover:bg-primary/20 hover:text-primary p-0 px-3 flex items-center gap-1 bg-primary/5 rounded-full transition-colors border border-primary/10"
                            onClick={() => setActiveFamilyMemberInput(p.id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add family member
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-safe-pad bg-white border-t z-20">
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          onClick={handleSaveTrip}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Creating...
            </>
          ) : "Create trip group"}
        </Button>
      </footer>
    </div>
  );
}
