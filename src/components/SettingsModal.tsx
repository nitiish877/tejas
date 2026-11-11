import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AppSettings, SubscriptionPlanType, ThemeMode, UserProfile } from '../types';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  LogOut,
  LogIn,
  X,
  Sparkles,
  RefreshCw,
  Smartphone,
  Check,
  Cpu,
  Crown,
  Share2,
  Receipt,
  User as UserIcon,
  ChevronRight,
  ArrowLeft,
  Palette,
  MonitorCheck,
  Laptop,
  Bug,
  MessageSquareText,
  Lightbulb,
  Star,
  Send,
  Search,
  Copy,
  Pencil,
} from 'lucide-react';
import { getClientVersion } from '../version';
import { ConnectedEditor, fetchConnectedEditors, isGuestUser, revokeConnectedEditor, submitFeedback, SharedProjectSummary, SharedProjectDetail, fetchSharedProjects, fetchSharedProject, fetchSharedProjectCode, addSharedProjectMember, revokeSharedProjectMember, regenerateSharedProjectLink, joinSharedProject, createProjectInviteCode, updateSharedProjectMemberRole, deleteSharedProject } from '../utils/api';

const TOSSIVE_MARKETPLACE_ITEM_ID = 'nitishVishwakarma.tossive';
const TOSSIVE_VSCODE_MARKETPLACE_URL = `https://marketplace.visualstudio.com/items?itemName=${TOSSIVE_MARKETPLACE_ITEM_ID}`;
const TOSSIVE_VSCODE_URL = `vscode:extension/${TOSSIVE_MARKETPLACE_ITEM_ID}`;
const TOSSIVE_CURSOR_URL = `cursor:extension/${TOSSIVE_MARKETPLACE_ITEM_ID}`;
const TOSSIVE_WINDSURF_URL = `windsurf:extension/${TOSSIVE_MARKETPLACE_ITEM_ID}`;

const HIDE_SUBSCRIPTION_UI = true;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  currentUser: UserProfile;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenSubscription: (plan?: SubscriptionPlanType) => void;
  onOpenPaymentHistory?: () => void;
  onOpenSharedChats?: () => void;
  isDark: boolean;
  getApiUrl: (path: string) => string;
  openEditorOnOpen?: boolean;
  onCheckForUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

type SettingsView = 'menu' | 'preferences' | 'subscriptions' | 'account' | 'editor' | 'projects' | 'feedback';
type FeedbackKind = 'problem' | 'feedback' | 'feature';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  onOpenSubscription,
  onOpenPaymentHistory,
  onOpenSharedChats,
  isDark,
  getApiUrl,
  openEditorOnOpen = false,
  onCheckForUpdates,
  isCheckingUpdates = false,
}) => {
  const [view, setView] = useState<SettingsView>('menu');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPcOnlyNotice, setShowPcOnlyNotice] = useState(false);
  const [showInstallChooser, setShowInstallChooser] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const [connectedEditors, setConnectedEditors] = useState<ConnectedEditor[]>([]);
  const [revokingEditorId, setRevokingEditorId] = useState<string | null>(null);
  const [connectionsError, setConnectionsError] = useState('');
  const [sharedProjects, setSharedProjects] = useState<SharedProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [projectQr, setProjectQr] = useState('');
  const [cameraScanning, setCameraScanning] = useState(false);
  const cameraVideo = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream|null>(null);
  const cameraStop = useRef(false);
  const [selectedSharedProject, setSelectedSharedProject] = useState<SharedProjectDetail | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'editor'|'viewer'>('editor');
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectMessage, setProjectMessage] = useState('');
  const [projectLinkCopied, setProjectLinkCopied] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string|null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDetails, setFeedbackDetails] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches,
  );
  const isGuest = isGuestUser(currentUser);

  useEffect(() => {
    if (!isOpen || !openEditorOnOpen) return;
    setView('editor');
    if (isMobileDevice) setShowPcOnlyNotice(true);
  }, [isOpen, openEditorOnOpen, isMobileDevice]);

  useEffect(() => {
    if (!isOpen || view !== 'editor' || isGuest) {
      setConnectedEditors([]);
      setConnectionsError('');
      return;
    }

    let active = true;
    const loadConnections = () => {
      fetchConnectedEditors(getApiUrl)
        .then(({ connections }) => {
          if (active) setConnectedEditors(connections);
        })
        .catch((error: any) => {
          if (active) setConnectionsError(error?.message || 'Could not load editor connections.');
        });
    };

    loadConnections();
    const refreshId = window.setInterval(loadConnections, 10000);
    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, [isOpen, view, isGuest, getApiUrl]);

  useEffect(() => {
    if (!isOpen || (view !== 'editor' && view !== 'projects') || isGuest) return;
    let active = true;
    setProjectsLoading(true);
    fetchSharedProjects(getApiUrl).then(({projects}) => { if (active) setSharedProjects(projects); })
      .catch((error:any) => { if (active) setProjectMessage(error?.message || 'Could not load shared projects.'); })
      .finally(()=>{if(active)setProjectsLoading(false);});
    return () => { active = false; };
  }, [isOpen, view, isGuest, getApiUrl]);

  const openSharedProject = async (id:string) => {
    setProjectBusy(true); setProjectMessage('Loading project members and activity…');
    try { setSelectedSharedProject(await fetchSharedProject(getApiUrl,id)); setProjectMessage(''); }
    catch (error:any) { setProjectMessage(error?.message || 'Could not load project details.'); }
    finally { setProjectBusy(false); }
  };
  const inviteProjectMember = async () => {
    if (!selectedSharedProject || !memberEmail.trim()) return;
    setProjectBusy(true); setProjectMessage('Adding project member…');
    try { await addSharedProjectMember(getApiUrl,selectedSharedProject.project.id,memberEmail.trim(),memberRole); setMemberEmail(''); await openSharedProject(selectedSharedProject.project.id); setProjectMessage('Member added.'); }
    catch(error:any) { setProjectMessage(error?.message || 'Could not add this member.'); }
    finally { setProjectBusy(false); }
  };
  const revokeProjectMember = async (userId:string) => {
    if (!selectedSharedProject) return;
    setProjectBusy(true); setProjectMessage('Revoking project access…');
    try { await revokeSharedProjectMember(getApiUrl,selectedSharedProject.project.id,userId); await openSharedProject(selectedSharedProject.project.id); setProjectMessage('Project access revoked.'); }
    catch(error:any) { setProjectMessage(error?.message || 'Could not revoke access.'); }
    finally { setProjectBusy(false); }
  };
  const downloadSharedCode = async () => {
    if(!selectedSharedProject) return;
    setProjectBusy(true); setProjectMessage('Preparing shared project download…');
    try { const result=await fetchSharedProjectCode(getApiUrl,selectedSharedProject.project.id); const blob=new Blob([JSON.stringify(result.files,null,2)],{type:'application/json'}); const href=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=href; a.download=`${selectedSharedProject.project.name.replace(/[^a-z0-9-_]/gi,'-')}-shared-files.json`; a.click(); URL.revokeObjectURL(href); setProjectMessage('Shared files downloaded as a reviewable JSON bundle.'); }
    catch(error:any){setProjectMessage(error?.message||'Could not download shared code.');}
    finally{setProjectBusy(false);}
  };
  const shareProjectLink = async () => {
    const url=selectedSharedProject?.project.share_url;
    if(!url) return;
    try {
      if(navigator.share) await navigator.share({title:selectedSharedProject.project.name,text:'Shared project link',url});
      else { await navigator.clipboard.writeText(url); setProjectLinkCopied(true); window.setTimeout(()=>setProjectLinkCopied(false),2200); }
    } catch(error:any) { if(error?.name!=='AbortError') setProjectMessage('Could not open sharing options. Copy the link instead.'); }
  };
  const copyProjectLink = async () => {
    const url=selectedSharedProject?.project.share_url;
    if(!url) return;
    try { await navigator.clipboard.writeText(url); setProjectLinkCopied(true); window.setTimeout(()=>setProjectLinkCopied(false),2200); }
    catch { setProjectMessage('Could not copy the link. Select and copy it manually.'); }
  };
  const renewProjectLink = async () => {
    if(!selectedSharedProject) return;
    const password=window.prompt('Optional: set a password for this share link (minimum 8 characters). Leave blank for no password. Cancel to stop.');
    if(password===null)return;
    setProjectBusy(true); setProjectMessage('Creating a new share link…');
    try {
      const {shareUrl}=await regenerateSharedProjectLink(getApiUrl,selectedSharedProject.project.id,password);
      setSelectedSharedProject(current=>current?{...current,project:{...current.project,share_url:shareUrl}}:current);
      setProjectMessage('New share link created. The previous link no longer works.');
    } catch(error:any) { setProjectMessage(error?.message||'Could not create a new share link.'); }
    finally { setProjectBusy(false); }
  };
  const changeMemberRole=async(userId:string,role:'editor'|'viewer')=>{
    if(!selectedSharedProject)return;setProjectBusy(true);
    try{await updateSharedProjectMemberRole(getApiUrl,selectedSharedProject.project.id,userId,role);await openSharedProject(selectedSharedProject.project.id);setProjectMessage('Member permission updated.');}
    catch(error:any){setProjectMessage(error?.message||'Could not update member permission.');}finally{setProjectBusy(false);}
  };
  const removeProject=async()=>{
    if(!selectedSharedProject)return;
    const id=selectedSharedProject.project.id;setProjectBusy(true);
    try{await deleteSharedProject(getApiUrl,id);setSelectedSharedProject(null);setSharedProjects(items=>items.filter(item=>item.id!==id));setProjectMessage('Project and its shares deleted.');}
    catch(error:any){setProjectMessage(error?.message||'Could not delete project.');}finally{setProjectBusy(false);}
  };
  const showProjectQr = async () => {
    const selected=selectedSharedProject;
    if(!selected) return;
    try { setProjectBusy(true); const {code}=await createProjectInviteCode(getApiUrl,selected.project.id); setProjectQr(await QRCode.toDataURL(code,{width:220,margin:1})); setProjectMessage('QR code expires in 5 minutes.'); }
    catch { setProjectMessage('Could not create project QR code.'); }
    finally { setProjectBusy(false); }
  };
  const joinProjectByCode = async () => {
    if(!joinCode.trim()) return;
    setProjectBusy(true); setProjectMessage('Joining project…');
    try { await joinSharedProject(getApiUrl,joinCode.trim()); setJoinCode(''); setProjectMessage('Project joined as viewer.'); const {projects}=await fetchSharedProjects(getApiUrl); setSharedProjects(projects); }
    catch(error:any) { setProjectMessage(error?.message||'Could not join project.'); }
    finally { setProjectBusy(false); }
  };
  useEffect(()=>{
    if(!cameraScanning) return;
    let timer=0; cameraStop.current=false;
    const start=async()=>{
      try{
        const Detector=(window as any).BarcodeDetector;
        if(!Detector) throw new Error('QR camera scanning is not supported in this browser.');
        const detector=new Detector({formats:['qr_code']});
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        cameraStream.current=stream;
        if(cameraVideo.current){cameraVideo.current.srcObject=stream;await cameraVideo.current.play();}
        const scan=async()=>{
          if(cameraStop.current||!cameraVideo.current)return;
          try{const codes=await detector.detect(cameraVideo.current);const code=String(codes[0]?.rawValue||'').toUpperCase().match(/[A-Z0-9]{10}/)?.[0];if(code){cameraStop.current=true;setCameraScanning(false);setJoinCode(code);setProjectBusy(true);setProjectMessage('Code detected. Joining project…');try{await joinSharedProject(getApiUrl,code);const {projects}=await fetchSharedProjects(getApiUrl);setSharedProjects(projects);setProjectMessage('Project joined as viewer.');}catch(error:any){setProjectMessage(error?.message||'Could not join project.');}finally{setProjectBusy(false);}return;}}catch{}
          timer=window.setTimeout(scan,250);
        };scan();
      }catch(error:any){setProjectMessage(error?.message||'Could not open camera. Allow camera access and try again.');setCameraScanning(false);}
    };
    void start();
    return()=>{cameraStop.current=true;window.clearTimeout(timer);cameraStream.current?.getTracks().forEach(track=>track.stop());cameraStream.current=null;};
  },[cameraScanning,getApiUrl]);

  const handleRevokeEditor = async (installationId: string) => {
    setRevokingEditorId(installationId);
    setConnectionsError('');
    try {
      await revokeConnectedEditor(getApiUrl, installationId);
      setConnectedEditors((current) => current.filter((editor) => editor.installationId !== installationId));
    } catch (error: any) {
      setConnectionsError(error?.message || 'Could not disconnect this editor.');
    } finally {
      setRevokingEditorId(null);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const updateDevice = () => setIsMobileDevice(mediaQuery.matches);
    updateDevice();
    mediaQuery.addEventListener('change', updateDevice);
    return () => mediaQuery.removeEventListener('change', updateDevice);
  }, []);

  if (!isOpen) return null;

  const themes: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'bright', label: 'Bright', icon: Sun },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const handleModelChange = (modelId: string) => {
    const planMap: Record<string, SubscriptionPlanType> = {
      'meta-llama/Llama-3.2-1B-Instruct': 'free',
      'meta-llama/Llama-3.2-3B-Instruct': 'cat',
      'meta-llama/Llama-3.1-8B-Instruct': 'chetak',
      'meta-llama/Llama-3.3-70B-Instruct': 'arka',
    };
    onUpdateSettings({
      selectedModel: modelId,
      subscriptionPlan: planMap[modelId] || 'free',
    });
  };

  const getPlanBadge = () => {
    const plan = settings.subscriptionPlan || 'free';
    if (plan === 'arka') return { name: 'Arka (70B) Pro', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    if (plan === 'chetak') return { name: 'Chetak (8B)', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (plan === 'cat') return { name: 'Cat (3B) Test', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    return {
      name: 'Free Tier',
      className: isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-700 border-zinc-300',
    };
  };

  const currentBadge = getPlanBadge();

  const handleClose = () => {
    setView('menu');
    setShowLogoutConfirm(false);
    setShowPcOnlyNotice(false);
    setShowInstallChooser(false);
    onClose();
  };

  const handleBack = () => {
    if (view === 'feedback' && feedbackKind) {
      setFeedbackKind(null);
      setFeedbackCategory('');
      setFeedbackTitle('');
      setFeedbackDetails('');
      setFeedbackRating(0);
      setFeedbackResult('');
      setFeedbackError('');
      return;
    }
    setView('menu');
    setShowLogoutConfirm(false);
    setShowPcOnlyNotice(false);
    setShowInstallChooser(false);
  };

  const startFeedbackForm = (kind: FeedbackKind) => {
    setFeedbackKind(kind);
    setFeedbackCategory(kind === 'problem' ? 'chat' : kind === 'feedback' ? 'general' : 'feature');
    setFeedbackTitle('');
    setFeedbackDetails('');
    setFeedbackRating(0);
    setFeedbackResult('');
    setFeedbackError('');
  };

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!feedbackKind || feedbackBusy) return;
    setFeedbackBusy(true);
    setFeedbackError('');
    setFeedbackResult('');
    try {
      const result = await submitFeedback(getApiUrl, {
        kind: feedbackKind,
        category: feedbackCategory || (feedbackKind === 'feedback' ? 'general' : ''),
        title: feedbackKind === 'feedback'
          ? `Rating ${feedbackRating}/5`
          : feedbackKind === 'feature'
          ? feedbackDetails.slice(0, 160)
          : feedbackTitle,
        details: feedbackDetails,
        rating: feedbackKind === 'feedback' ? feedbackRating : undefined,
      });
      setFeedbackResult(
        feedbackKind === 'problem' && result.groupedCount > 1
          ? `Thanks. This report is grouped with ${result.groupedCount} similar reports.`
          : 'Thanks, your submission has been saved.'
      );
      setFeedbackTitle('');
      setFeedbackDetails('');
      setFeedbackRating(0);
    } catch (error: any) {
      setFeedbackError(error?.message || 'Could not save your submission. Please try again.');
    } finally {
      setFeedbackBusy(false);
    }
  };

  const RowButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    disabled?: boolean;
    muted?: boolean;
    rightHint?: React.ReactNode;
  }> = ({ icon, title, subtitle, onClick, disabled, muted, rightHint }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
        isDark
          ? `bg-zinc-900/60 border-zinc-800 ${muted ? 'opacity-60' : 'hover:border-zinc-700 hover:bg-zinc-900'} disabled:opacity-50`
          : `bg-zinc-50 border-zinc-200 ${muted ? 'opacity-60' : 'hover:border-zinc-300 hover:bg-zinc-100'} disabled:opacity-50`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{subtitle}</p>}
        </div>
      </div>
      {rightHint ?? <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />}
    </button>
  );

  const IconBox: React.FC<{ children: React.ReactNode; tone?: 'blue' | 'amber' | 'emerald' | 'fuchsia' | 'violet' | 'default' }> = ({
    children,
    tone = 'default',
  }) => {
    const toneClass =
      tone === 'blue'
        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
        : tone === 'amber'
        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        : tone === 'emerald'
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        : tone === 'fuchsia'
        ? 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30'
        : tone === 'violet'
        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
        : 'bg-zinc-800 text-zinc-200';

    return <div className={`p-2 rounded-lg shrink-0 ${toneClass}`}>{children}</div>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm flex justify-center items-start sm:items-center min-h-screen animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md my-auto max-h-[92vh] flex flex-col rounded-2xl border shadow-xl p-5 sm:p-6 relative overflow-y-auto ${
          isDark ? 'bg-[#16191c] border-zinc-800 text-zinc-100' : 'bg-[#f5f8fa] border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          {view !== 'menu' ? (
            <button
              type="button"
              onClick={handleBack}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              {view === 'menu'
                ? 'Settings'
                : view === 'preferences'
                ? 'Preferences'
                : view === 'subscriptions'
                ? 'Subscriptions'
                : view === 'editor'
                ? 'Code Editor'
                : view === 'feedback'
                ? 'Report & Feedback'
                : 'Account'}
            </h2>
            <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {view === 'menu'
                ? 'Preferences, subscriptions & account'
                : view === 'preferences'
                ? 'Theme & notifications'
                : view === 'subscriptions'
                ? 'Models, plans & payments'
                : view === 'editor'
                ? 'Connect your desktop editor'
                : view === 'feedback'
                ? 'Report a problem or share an idea'
                : 'Profile, shares & app info'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className={`p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {view === 'menu' && (
          <div className="space-y-3">
            <RowButton
              icon={<IconBox tone="blue"><Palette className="w-4 h-4" /></IconBox>}
              title="Preferences"
              subtitle="Theme & sound notifications"
              onClick={() => setView('preferences')}
            />

            <RowButton
              icon={<IconBox tone="emerald"><Laptop className="w-4 h-4" /></IconBox>}
              title="Code Editor"
              subtitle="Install Tossive and manage shared projects"
              onClick={() => setView('editor')}
            />

            {!HIDE_SUBSCRIPTION_UI && (
              <RowButton
                icon={<IconBox tone="amber"><Crown className="w-4 h-4" /></IconBox>}
                title="Subscriptions"
                subtitle={`Current: ${currentBadge.name}`}
                onClick={() => setView('subscriptions')}
              />
            )}

            <RowButton
              icon={<IconBox tone="violet"><UserIcon className="w-4 h-4" /></IconBox>}
              title="Account"
              subtitle={isGuest ? 'Guest session' : currentUser.email || 'Signed in'}
              onClick={() => setView('account')}
            />

            <RowButton
              icon={<IconBox tone="fuchsia"><MessageSquareText className="w-4 h-4" /></IconBox>}
              title="Report & Feedback"
              subtitle="Problems, feedback, and feature ideas"
              onClick={() => { setFeedbackKind(null); setFeedbackTitle(''); setFeedbackDetails(''); setFeedbackRating(0); setFeedbackResult(''); setFeedbackError(''); setView('feedback'); }}
            />
          </div>
        )}

        {view === 'feedback' && (
          <div className="space-y-3">
            {!feedbackKind ? (
              <>
                <RowButton
                  icon={<IconBox tone="amber"><Bug className="w-4 h-4" /></IconBox>}
                  title="Report a problem"
                  subtitle="Tell us what went wrong"
                  onClick={() => startFeedbackForm('problem')}
                />
                <RowButton
                  icon={<IconBox tone="blue"><Star className="w-4 h-4" /></IconBox>}
                  title="Give your feedback"
                  subtitle="Rate Colaus and share your thoughts"
                  onClick={() => startFeedbackForm('feedback')}
                />
                <RowButton
                  icon={<IconBox tone="emerald"><Lightbulb className="w-4 h-4" /></IconBox>}
                  title="Feature request"
                  subtitle="Suggest a feature to add"
                  onClick={() => startFeedbackForm('feature')}
                />
              </>
            ) : feedbackResult ? (
              <div className={`rounded-xl border p-4 text-sm ${isDark ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">
                {feedbackResult}
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                {feedbackKind !== 'feedback' && (
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">{feedbackKind === 'problem' ? 'Problem category' : 'Feature category'}</span>
                    <select required value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}`}>
                      {feedbackKind === 'problem' ? <>
                        <option value="chat">Chat / AI response</option><option value="account">Login / account</option><option value="files">Files / uploads</option><option value="performance">Speed / availability</option><option value="billing">Subscription / payments</option><option value="other">Other</option>
                      </> : <>
                        <option value="feature">General feature idea</option><option value="chat">Chat</option><option value="account">Account</option><option value="files">Files / uploads</option><option value="mobile">Mobile experience</option><option value="other">Other</option>
                      </>}
                    </select>
                  </label>
                )}

                {feedbackKind === 'feedback' && (
                  <div>
                    <p className="mb-2 text-xs font-medium">How would you rate Colaus?</p>
                    <div className="flex gap-1" role="radiogroup" aria-label="Rate Colaus from one to five stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" role="radio" aria-checked={feedbackRating === star} aria-label={`${star} star${star === 1 ? '' : 's'}`} onClick={() => setFeedbackRating(star)} className="rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-amber-400">
                          <Star className={`h-7 w-7 ${star <= feedbackRating ? 'fill-amber-400 text-amber-400' : isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {feedbackKind === 'problem' && (
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">Short title</span>
                    <input required maxLength={160} value={feedbackTitle} onChange={(event) => setFeedbackTitle(event.target.value)} placeholder="What happened?" className={`w-full rounded-xl border px-3 py-2.5 text-sm ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500' : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400'}`} />
                  </label>
                )}

                <label className="block space-y-1">
                  <span className="text-xs font-medium">{feedbackKind === 'problem' ? 'Describe the problem' : feedbackKind === 'feature' ? 'Describe the feature you want' : 'Tell us what you think'}</span>
                  <textarea required maxLength={3000} rows={4} value={feedbackDetails} onChange={(event) => setFeedbackDetails(event.target.value)} placeholder="Type your message here…" className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500' : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400'}`} />
                </label>

                {feedbackError && <p role="alert" className="text-xs text-red-400">{feedbackError}</p>}
                <button type="submit" disabled={feedbackBusy || (feedbackKind === 'feedback' && !feedbackRating)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" />{feedbackBusy ? 'Sending…' : 'Submit'}
                </button>
              </form>
            )}
          </div>
        )}

        {view === 'preferences' && (
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = settings.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onUpdateSettings({ theme: t.id })}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-zinc-700 border-zinc-500 text-white'
                            : 'bg-zinc-200 border-zinc-400 text-zinc-900'
                          : isDark
                          ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.notificationsEnabled ? 'bg-zinc-800 text-zinc-200' : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                  {settings.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Sound Notifications</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Chime when response finishes streaming</p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.notificationsEnabled}
                onClick={() => onUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                  settings.notificationsEnabled ? 'bg-zinc-100 dark:bg-white' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.notificationsEnabled ? 'translate-x-6 bg-zinc-900 dark:bg-zinc-950' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {view === 'editor' && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'}`}>
              <div className="flex items-start gap-3">
                <IconBox tone="emerald"><Laptop className="w-4 h-4" /></IconBox>
                <div>
                  <h3 className="text-sm font-semibold">Connect a code editor</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Use the Tossive panel in your desktop editor to select workspace files, generate projects, review changes, and accept or undo edits.
                  </p>
                </div>
              </div>
            </div>

            {!isMobileDevice && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEditor(null);
                  setShowInstallChooser(true);
                }}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Install Tossive
              </button>
            )}

            <button type="button" onClick={()=>setView('projects')} className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold ${isDark?'border-zinc-700 hover:bg-zinc-800':'border-zinc-300 hover:bg-zinc-100'}`}>Projects</button>
          </div>
        )}

        {view === 'projects' && (
          <div className="space-y-4">
            <button type="button" className="text-xs font-medium text-blue-500" onClick={()=>{setSelectedSharedProject(null);setView('editor');}}>← Code editor</button>
            {!isGuest ? (
              <div className="py-1">
                <div className="flex items-center justify-between"><h3 className={`text-xs font-medium ${isDark?'text-zinc-300':'text-zinc-600'}`}>Your projects</h3>{!selectedSharedProject&&<button aria-label="Search projects" onClick={()=>setShowProjectSearch(v=>!v)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800/60"><Search size={16}/></button>}</div>
                {showProjectSearch&&!selectedSharedProject&&<input autoFocus value={projectSearch} onChange={e=>setProjectSearch(e.target.value)} placeholder="Search projects" className={`mt-2 w-full rounded-lg border px-3 py-2 text-xs ${isDark?'border-zinc-700 bg-zinc-950':'border-zinc-300 bg-white'}`} />}
                {!selectedSharedProject&&<div className="mt-3 flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,10))} placeholder="Add existing project code" className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs ${isDark?'border-zinc-700 bg-zinc-950':'border-zinc-300 bg-white'}`} /><button disabled={projectBusy||joinCode.length!==10} onClick={joinProjectByCode} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Join</button></div>}
                {!selectedSharedProject&&<button type="button" onClick={()=>{setProjectMessage('');setCameraScanning(true);}} className={`mt-2 w-full rounded-lg border px-3 py-2 text-xs ${isDark?'border-zinc-700':'border-zinc-300'}`}>Scan project QR</button>}
                {projectMessage && <p className={`mt-3 text-xs ${projectMessage.includes('Could not')?'text-red-500':'text-blue-500'}`}>{projectMessage}</p>}
                {selectedSharedProject ? <div className="mt-4 space-y-4">
                  <button type="button" className="text-xs font-medium text-blue-500" onClick={()=>setSelectedSharedProject(null)}>← All shared projects</button>
                  <div className={`rounded-lg border p-3 ${isDark?'border-zinc-800 bg-zinc-950/40':'border-zinc-200 bg-zinc-50'}`}><p className="text-sm font-semibold">{selectedSharedProject.project.name}</p><p className="mt-1 text-xs text-zinc-500">{selectedSharedProject.project.share_mode==='code'?'Context + code':'Agent context only'} · Admin: {selectedSharedProject.members.find(m=>m.role==='admin')?.name || 'Project owner'}</p></div>
                  {selectedSharedProject.project.role==='admin'&&<div className="flex justify-end"><button onClick={showProjectQr} className="rounded-md px-2 py-1 text-xs text-blue-500">Create 5-minute join QR</button></div>}
                  {projectQr&&selectedSharedProject.project.role==='admin'&&<div className="relative flex justify-center bg-white p-3"><img src={projectQr} alt="Project join QR code" className="h-44 w-44"/><button onClick={()=>setProjectQr('')} aria-label="Close QR" className="absolute right-2 top-2 rounded-full bg-white p-1 text-zinc-700">×</button></div>}
                  <div className={`rounded-lg border p-3 ${isDark?'border-zinc-800':'border-zinc-200'}`}>
                    <p className="text-xs font-semibold">Share link</p>
                    {selectedSharedProject.project.share_url ? <>
                      <div className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 ${isDark?'border-zinc-700 bg-zinc-950':'border-zinc-300 bg-white'}`}><a href={selectedSharedProject.project.share_url} target="_blank" rel="noreferrer" title={selectedSharedProject.project.share_url} className="min-w-0 flex-1 truncate text-xs text-blue-500">{selectedSharedProject.project.share_url}</a><button onClick={copyProjectLink} aria-label="Copy share link" title={projectLinkCopied?'Copied':'Copy link'} className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-blue-500"><Copy size={15}/></button></div>
                      <p className="mt-2 text-[11px] text-zinc-500">Anyone with this link can open the shared {selectedSharedProject.project.share_mode==='code'?'project files and context':'agent context'}.</p>
                    </> : <div className="mt-2"><p className="text-xs text-zinc-500">No public link exists yet.</p>{selectedSharedProject.project.role==='admin'&&<button disabled={projectBusy} onClick={renewProjectLink} className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Create share link</button>}</div>}
                  </div>
                  {selectedSharedProject.project.share_mode==='code'&&<button disabled={projectBusy} onClick={downloadSharedCode} className="rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-semibold text-blue-500 disabled:opacity-50">Download shared code bundle</button>}
                  <div><p className="text-xs font-semibold">Members and access</p><div className="mt-2 space-y-2">{selectedSharedProject.members.map(member=><div key={member.user_id} className={`rounded-lg border p-2.5 ${isDark?'border-zinc-800':'border-zinc-200'}`}><div className="flex items-center justify-between"><div><p className="text-xs font-medium">{member.name} <span className="text-zinc-500">· {member.role}</span></p><p className="text-[11px] text-zinc-500">{member.email}</p></div>{selectedSharedProject.project.role==='admin'&&member.role!=='admin'&&<button disabled={projectBusy} title="Member settings" aria-label={`Edit ${member.name} access`} aria-expanded={editingMemberId===member.user_id} className="text-zinc-500 disabled:opacity-50" onClick={()=>setEditingMemberId(id=>id===member.user_id?null:member.user_id)}><Pencil size={14}/></button>}</div>{editingMemberId===member.user_id&&selectedSharedProject.project.role==='admin'&&<div className="mt-2 flex items-center gap-3 border-t border-zinc-700/50 pt-2"><span className="text-[11px] text-zinc-500">Access:</span><button disabled={projectBusy||member.role==='viewer'} onClick={()=>changeMemberRole(member.user_id,'viewer')} className={`text-xs ${member.role==='viewer'?'text-blue-500':'text-zinc-400'}`}>Viewer</button><button disabled={projectBusy||member.role==='editor'} onClick={()=>changeMemberRole(member.user_id,'editor')} className={`text-xs ${member.role==='editor'?'text-blue-500':'text-zinc-400'}`}>Editor</button><button disabled={projectBusy} className="ml-auto text-xs text-red-500 disabled:opacity-50" onClick={()=>revokeProjectMember(member.user_id)}>Revoke</button></div>}</div>)}</div></div>
                  {selectedSharedProject.project.role==='admin'&&<div className="flex flex-wrap gap-2"><input value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} placeholder="Existing Colaus account email" className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs ${isDark?'border-zinc-700 bg-zinc-950':'border-zinc-300 bg-white'}`} /><select value={memberRole} onChange={e=>setMemberRole(e.target.value as 'editor'|'viewer')} className={`rounded-lg border px-2 py-2 text-xs ${isDark?'border-zinc-700 bg-zinc-950':'border-zinc-300 bg-white'}`}><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button disabled={projectBusy||!memberEmail.trim()} onClick={inviteProjectMember} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Add member</button></div>}
                  {selectedSharedProject.project.role==='admin'&&<div><p className="text-xs font-semibold">Recent project activity</p><div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{selectedSharedProject.activity.map(event=><div key={event.id} className="border-l-2 border-blue-500/50 pl-2.5"><p className="text-xs">{event.actor_name||'Member'} · {event.event_type.replaceAll('_',' ')}</p><p className="text-[10px] text-zinc-500">{new Date(event.created_at).toLocaleString()}</p></div>)}{!selectedSharedProject.activity.length&&<p className="text-xs text-zinc-500">No activity yet.</p>}</div></div>}
                  {selectedSharedProject.project.role==='admin'&&!showDeleteConfirmation&&<button disabled={projectBusy} onClick={()=>setShowDeleteConfirmation(true)} className="text-left text-xs text-red-500 disabled:opacity-50">Delete project</button>}
                  {selectedSharedProject.project.role==='admin'&&showDeleteConfirmation&&<div role="alertdialog" aria-label="Confirm project deletion" className={`rounded-lg p-3 ${isDark?'bg-red-950/30':'bg-red-50'}`}><p className="text-sm font-medium">Delete this project?</p><p className="mt-1 text-xs text-zinc-500">Its share links, QR invites, files, members, and activity will be deleted.</p><div className="mt-3 flex justify-end gap-2"><button disabled={projectBusy} onClick={()=>setShowDeleteConfirmation(false)} className="rounded-md px-3 py-1.5 text-xs">Cancel</button><button disabled={projectBusy} onClick={removeProject} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{projectBusy?'Deleting…':'Delete project'}</button></div></div>}
                </div> : <div className="mt-2">{projectsLoading?<div className="py-4 text-center text-xs text-zinc-500">Loading projects…</div>:<>{sharedProjects.filter(p=>p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(project=><div key={project.id} className={`flex items-center py-1 ${isDark?'hover:bg-zinc-800/60':'hover:bg-zinc-100'}`}><button onClick={()=>openSharedProject(project.id)} className="min-w-0 flex-1 py-2 text-left"><span className="text-sm font-medium">{project.name}</span><span className="ml-2 text-xs text-zinc-500">· {project.member_count} members · {project.role}</span></button><button aria-label={`Share ${project.name}`} title="Share project" onClick={()=>openSharedProject(project.id)} className="rounded-md p-2 text-zinc-500 hover:text-blue-500"><Share2 size={15}/></button></div>)}{!sharedProjects.length&&<div className="py-4 text-center text-xs text-zinc-500">No shared projects yet. Share a project from Tossive.</div>}</>}</div>}
                {projectBusy&&<p className="mt-2 text-xs text-zinc-500">Updating project…</p>}
              </div>
            ) : <div className="rounded-xl border border-zinc-700 p-4 text-xs text-zinc-500">Sign in to manage shared projects and team members.</div>}
          </div>
        )}

        {view === 'subscriptions' && !HIDE_SUBSCRIPTION_UI && (
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Active AI Model
              </label>

              <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-200">
                      <Cpu className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Selected Model</p>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {settings.ownedPlans && settings.ownedPlans.length > 0 ? 'Switch between your owned models' : 'Upgrade to unlock more models'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${currentBadge.className}`}>
                    {currentBadge.name}
                  </span>
                </div>

                <select
                  value={settings.selectedModel || 'meta-llama/Llama-3.2-1B-Instruct'}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className={`w-full text-xs rounded-lg px-3 py-2.5 border outline-none font-medium ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 focus:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-800 focus:border-zinc-500'
                  }`}
                >
                  <option value="meta-llama/Llama-3.2-1B-Instruct">sieo (Free Tier - Fast & Lightweight)</option>
                  {(settings.ownedPlans || []).includes('cat') && (
                    <option value="meta-llama/Llama-3.2-3B-Instruct">Cat (3B - Active Subscription)</option>
                  )}
                  {(settings.ownedPlans || []).includes('chetak') && (
                    <option value="meta-llama/Llama-3.1-8B-Instruct">Chetak (8B - Active Subscription)</option>
                  )}
                  {(settings.ownedPlans || []).includes('arka') && (
                    <option value="meta-llama/Llama-3.3-70B-Instruct">Arka (70B - Active Subscription)</option>
                  )}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenSubscription();
              }}
              className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isDark
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconBox tone="amber"><Sparkles className="w-4 h-4" /></IconBox>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Manage Subscription</p>
                  <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {settings.subscriptionPlan && settings.subscriptionPlan !== 'free' && settings.subscriptionExpiresAt ? (
                      <span className="text-emerald-400 font-medium">
                        Active • Reverts in {Math.max(0, Math.ceil((settings.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    ) : (
                      'View plans & upgrade'
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </button>

            <RowButton
              icon={<IconBox tone="emerald"><Receipt className="w-4 h-4" /></IconBox>}
              title="Payment History"
              subtitle={isGuest ? 'Sign in to view payments' : 'View all payments & download receipts'}
              onClick={() => {
                handleClose();
                onOpenPaymentHistory?.();
              }}
              disabled={isGuest}
            />
          </div>
        )}

        {view === 'account' && (
          <div className="space-y-4">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (isGuest) {
                      handleClose();
                      onOpenAuth?.();
                      return;
                    }
                    handleClose();
                    onOpenProfile?.();
                  }}
                  className="flex items-center gap-2.5 truncate pr-2 flex-1 text-left rounded-lg -m-1 p-1 transition-colors hover:bg-zinc-800/40"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-sm shrink-0">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>

                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{currentUser.name || 'Colaus User'}</p>
                    <p className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {isGuest ? 'Guest • Tap to sign in' : currentUser.email}
                    </p>
                  </div>

                  <ChevronRight className={`w-4 h-4 ml-auto shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                </button>
              </div>
            </div>

            <RowButton
              icon={<IconBox tone="fuchsia"><Share2 className="w-4 h-4" /></IconBox>}
              title="My Shared Chats"
              subtitle={isGuest ? 'Sign in to view your shared chats' : 'History of chats you have shared'}
              onClick={() => {
                handleClose();
                onOpenSharedChats?.();
              }}
              disabled={isGuest}
            />

            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <IconBox tone="emerald"><Smartphone className="w-4 h-4" /></IconBox>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">App Version</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      v{getClientVersion()}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Over-the-air updates</p>
                </div>
              </div>

              {onCheckForUpdates && (
                <button
                  type="button"
                  onClick={onCheckForUpdates}
                  disabled={isCheckingUpdates}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shrink-0 ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-blue-400' : ''}`} />
                  <span>{isCheckingUpdates ? 'Checking...' : 'Check'}</span>
                </button>
              )}
            </div>

            {isGuest ? (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenAuth?.();
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors ${
                  isDark
                    ? 'text-blue-300 border-blue-500/30 hover:bg-blue-500/10'
                    : 'text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            ) : !showLogoutConfirm ? (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onLogout?.();
                    setShowLogoutConfirm(false);
                    handleClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 text-white"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                    isDark ? 'text-zinc-300 border-zinc-700' : 'text-zinc-700 border-zinc-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showPcOnlyNotice && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowPcOnlyNotice(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="editor-pc-only-title"
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-zinc-700 bg-[#16191c] text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <IconBox tone="blue"><Laptop className="h-4 w-4" /></IconBox>
              <h3 id="editor-pc-only-title" className="text-base font-semibold">Available on PC or Mac</h3>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Tossive's code editor connection needs a desktop editor, so it can’t be used from a phone. Open Tossive on your computer to connect your code editor.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setShowPcOnlyNotice(false)}
              className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
            >
              Got it
            </button>
          </section>
        </div>
      )}

      {cameraScanning&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black"><video ref={cameraVideo} playsInline muted className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-black/55"/><div className="relative h-64 w-64 rounded-3xl border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.58)]"/><button onClick={()=>setCameraScanning(false)} className="absolute right-5 top-5 rounded-full bg-black/50 px-4 py-2 text-sm text-white">Cancel</button></div>}
      {showInstallChooser && !isMobileDevice && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowInstallChooser(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-installer-title"
            className={`max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-zinc-700 bg-[#16191c] text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="editor-installer-title" className="text-base font-semibold">Choose your code editor</h3>
            <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Select the editor you use. This website can’t inspect which desktop editors are installed, so choose one manually.
            </p>

            <div className="mt-4 space-y-2">
              {[
                { id: 'vscode', name: 'Visual Studio Code', detail: 'Open the Tossive extension page in VS Code' },
                { id: 'cursor', name: 'Cursor', detail: 'Open the Tossive extension page in Cursor' },
                { id: 'windsurf', name: 'Windsurf', detail: 'Open the Tossive extension page in Windsurf' },
              ].map((editor) => {
                const selected = selectedEditor === editor.id;
                return (
                  <button
                    key={editor.id}
                    type="button"
                    onClick={() => setSelectedEditor(editor.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? isDark
                          ? 'border-blue-400 bg-blue-500/10'
                          : 'border-blue-500 bg-blue-50'
                        : isDark
                        ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium">{editor.name}</span>
                      <span className={`mt-0.5 block text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{editor.detail}</span>
                    </span>
                    {selected && <Check className="h-4 w-4 text-blue-500" />}
                  </button>
                );
              })}
            </div>

            {selectedEditor && (
              <div className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-blue-500/20 bg-blue-500/5 text-blue-100/80' : 'border-blue-300 bg-blue-50 text-blue-900'}`}>
                <p className="font-semibold">Install Tossive in {selectedEditor === 'vscode' ? 'VS Code' : selectedEditor === 'cursor' ? 'Cursor' : 'Windsurf'}:</p>
                <ol className="mt-1.5 list-inside list-decimal space-y-1">
                  <li>For direct install, click <span className="font-semibold">Open in {selectedEditor === 'vscode' ? 'VS Code' : selectedEditor === 'cursor' ? 'Cursor' : 'Windsurf'}</span> below.</li>
                  <li>Or click <span className="font-semibold">Download VSIX</span> to open the Marketplace page and download the latest VSIX file.</li>
                  <li>In {selectedEditor === 'vscode' ? 'VS Code' : selectedEditor === 'cursor' ? 'Cursor' : 'Windsurf'}, press <span className="font-semibold">Ctrl+Shift+P</span>.</li>
                  <li>Search for and choose <span className="font-semibold">Extensions: Install from VSIX…</span>.</li>
                  <li>Select the VSIX file you downloaded.</li>
                </ol>

                {selectedEditor !== 'windsurf' && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-zinc-700/50 bg-black/20">
                    <div className="relative">
                      <img
                        src={selectedEditor === 'vscode' ? '/tossive-vscode-guide.png' : '/tossive-cursor-guide.png'}
                        alt={selectedEditor === 'vscode' ? 'VS Code screenshot with an arrow pointing to the top-right sidebar control' : 'Cursor screenshot with an arrow pointing to the sidebar icon'}
                        className="block h-auto w-full"
                      />
                    </div>
                    <p className="px-3 py-2 text-[11px] text-zinc-200">
                      {selectedEditor === 'vscode'
                        ? 'Click the highlighted sidebar icon at the top right to open the side panel, then choose Tossive.'
                        : 'Click the highlighted icon beside Settings to open the side panel, then choose Tossive.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstallChooser(false)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700'}`}
                >
                  Close
                </button>

                {selectedEditor && (
                  <a
                    href={TOSSIVE_VSCODE_MARKETPLACE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors ${isDark ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700'}`}
                  >
                    Download in Editor
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
