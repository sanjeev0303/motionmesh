"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Key, Copy, CheckCircle2, Trash2, AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ApiKeysClientProps {
  initialKeys: any[];
}

export function ApiKeysClient({ initialKeys }: ApiKeysClientProps) {
  const { toast } = useToast();
  const api = useApi();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Create Key Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<"read" | "write" | "admin">("read");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: serverKeys, isLoading, isRefetching } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/api-keys" as any, {});
      if (error || !response.ok) {
        if (response?.status === 401 || response?.status === 403) {
          toast({ title: "Unauthorized", description: "Please log in to view your API keys.", variant: "destructive" });
        } else if (response?.status === 429) {
          toast({ title: "Rate Limited", description: "Too many requests. Please try again later.", variant: "destructive" });
        }
        throw new Error("Failed to load real API keys");
      }
      
      const keys = data ? (data as any) : await response.json().catch(() => []);
      return Array.isArray(keys) ? keys : [];
    },
    initialData: initialKeys,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const keys = serverKeys ?? [];
  const showSkeleton = isLoading && keys.length === 0;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied to clipboard",
      description: "API Key has been copied to your clipboard.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const { data, error } = await api.POST("/v1/api-keys" as any, {
        body: { name: newKeyName }
      });
      
      if (error) throw new Error("Failed to create API key");
      
      const newKey = (data as any).api_key;
      const fullKey = (data as any).key;
      
      queryClient.setQueryData(['apiKeys'], (oldData: any[] | undefined) => [newKey, ...(oldData || [])]);
      setNewlyCreatedKey(fullKey);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    try {
      const { error } = await api.DELETE(`/v1/api-keys/${id}` as any, {});
      if (error) throw new Error("Failed to revoke");

      queryClient.setQueryData(['apiKeys'], (oldData: any[] | undefined) => (oldData || []).filter((k: any) => k.id !== id));
      toast({
        title: "Key revoked",
        description: `The API key "${name}" has been revoked permanently.`,
        variant: "destructive"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setNewlyCreatedKey(null);
    setNewKeyName("");
    setNewKeyScope("read");
  };

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-borderSubtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">API Keys</h1>
            {isRefetching && (
              <div className="h-4 w-4 rounded-full border-2 border-accent-motion border-t-transparent animate-spin opacity-50" />
            )}
          </div>
          <p className="text-text-muted mt-1">Manage API keys to authenticate your backend services and clients.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateModal()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-accent-motion text-black hover:bg-accent-motion/90 font-medium h-9 px-4 shadow-md shadow-accent-motion/20">
              <Plus className="mr-1.5 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-borderSubtle text-text-primary sm:max-w-[500px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-motion via-accent-mesh to-violet-500" />
            <DialogHeader className="pt-2">
              <DialogTitle className="font-display text-xl text-text-primary">
                {newlyCreatedKey ? "Store your new API Key" : "Create a new API Key"}
              </DialogTitle>
              <DialogDescription className="text-text-muted text-sm mt-1.5">
                {newlyCreatedKey 
                  ? "Please copy this key and store it somewhere safe. For security reasons, we cannot show it to you again." 
                  : "Give your key a descriptive name and appropriate permissions."}
              </DialogDescription>
            </DialogHeader>

            {newlyCreatedKey ? (
              <div className="mt-4 space-y-5">
                <div className="p-4 bg-surface-raised border border-borderSubtle rounded-xl flex justify-between items-center group">
                  <code className="font-mono text-accent-motion break-all text-sm">{newlyCreatedKey}</code>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="ml-3 flex-shrink-0 hover:text-accent-motion text-text-muted hover:bg-surface transition-colors"
                    onClick={() => handleCopy('new', newlyCreatedKey)}
                  >
                    {copiedId === 'new' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0" />
                  <p className="leading-snug">You will not be able to see this token again after you close this dialog.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 py-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    Key Name
                  </label>
                  <Input 
                    placeholder="e.g., Production Worker" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-surface-raised border-borderSubtle focus-visible:ring-accent-motion placeholder:text-text-muted/50"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-text-primary">Scope</label>
                  <div className="flex gap-2 p-1 bg-surface-raised rounded-lg border border-borderSubtle">
                    {(['read', 'write', 'admin'] as const).map(scope => (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => setNewKeyScope(scope)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 capitalize ${
                          newKeyScope === scope 
                            ? 'bg-surface shadow-sm text-accent-motion ring-1 ring-borderSubtle' 
                            : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
                        }`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-surface-raised/50 rounded-lg border border-borderSubtle border-dashed">
                    <p className="text-xs text-text-muted flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {newKeyScope === 'read' && "Can only read data and access videos."}
                      {newKeyScope === 'write' && "Can upload videos and manage renditions."}
                      {newKeyScope === 'admin' && "Full access: Can manage buckets, keys, and billing."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-2 pt-4 border-t border-borderSubtle">
              {newlyCreatedKey ? (
                <Button onClick={closeCreateModal} className="w-full bg-accent-motion text-black hover:bg-accent-motion/90">
                  I have saved this key safely
                </Button>
              ) : (
                <div className="flex gap-3 w-full sm:justify-end">
                  <Button variant="outline" onClick={closeCreateModal} className="flex-1 sm:flex-none border-borderSubtle text-text-primary hover:bg-surface-raised">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newKeyName.trim()} className="flex-1 sm:flex-none bg-accent-motion text-black hover:bg-accent-motion/90">
                    Create Key
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showSkeleton ? (
        <div className="rounded-xl border border-borderSubtle bg-surface overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-surface-raised/50">
              <TableRow className="border-borderSubtle">
                <TableHead className="w-[250px]"><div className="h-4 bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
                <TableHead className="w-[100px]"><div className="h-4 bg-surface-raised/50 rounded w-full animate-pulse" /></TableHead>
                <TableHead className="w-[250px]"><div className="h-4 bg-surface-raised/50 rounded w-3/4 animate-pulse" /></TableHead>
                <TableHead className="w-[150px]"><div className="h-4 bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
                <TableHead className="w-[150px]"><div className="h-4 bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i} className="border-borderSubtle">
                  <TableCell><div className="h-4 bg-surface-raised/30 rounded w-3/4 animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-surface-raised/30 rounded-full w-16 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-surface-raised/30 rounded w-1/2 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-surface-raised/30 rounded w-1/2 animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 bg-surface-raised/30 rounded-md w-8 animate-pulse ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : keys.length > 0 ? (
        <div className="rounded-xl border border-borderSubtle bg-surface overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-surface-raised/50">
              <TableRow className="border-borderSubtle hover:bg-transparent">
                <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[250px]">Name</TableHead>
                <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[120px]">Scope</TableHead>
                <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[250px]">Key Prefix</TableHead>
                <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[150px]">Last Used</TableHead>
                <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[150px]">Created</TableHead>
                <TableHead className="w-[60px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => {
                const scopeDisplay = (key.scopes && key.scopes.length > 0 && key.scopes[0] !== "*") ? key.scopes[0] : "admin";
                return (
                  <TableRow key={key.id} className="border-borderSubtle hover:bg-surface-raised/50 transition-colors group">
                    <TableCell className="font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-text-muted" />
                        {key.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border ${
                        scopeDisplay === 'admin' ? 'bg-danger/10 text-danger border-danger/20' :
                        scopeDisplay === 'write' ? 'bg-accent-motion/10 text-accent-motion border-accent-motion/20' :
                        'bg-surface-raised text-text-primary border-borderSubtle'
                      }`}>
                        {scopeDisplay}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 group/copy">
                        <code className="font-mono text-sm text-text-muted px-2 py-0.5 rounded bg-surface-raised/50 border border-borderSubtle/50">
                          {key.prefix}••••••••
                        </code>
                        <button 
                          onClick={() => handleCopy(key.id, key.prefix)}
                          className="text-text-muted opacity-0 group-hover/copy:opacity-100 hover:text-text-primary transition-all p-1.5 rounded hover:bg-surface-raised"
                          title="Copy Prefix"
                        >
                          {copiedId === key.id ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell suppressHydrationWarning className="text-text-muted text-xs">
                      {!key.last_used_at ? "Never" : new Date(key.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell suppressHydrationWarning className="text-text-muted text-xs">
                      {new Date(key.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <button 
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="p-2 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all rounded-md hover:bg-danger/10"
                        title="Revoke Key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-borderSubtle border-dashed rounded-xl bg-surface shadow-sm">
          <div className="h-16 w-16 rounded-full bg-surface-raised flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 rounded-full border border-borderSubtle opacity-50" />
            <Key className="h-7 w-7 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No API keys</h3>
          <p className="text-text-muted text-sm max-w-sm mb-6">
            Create an API key to start integrating MotionMesh into your application.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-accent-motion text-black hover:bg-accent-motion/90 h-9">
            <Plus className="mr-1.5 h-4 w-4" />
            Create API Key
          </Button>
        </div>
      )}
    </div>
  );
}
