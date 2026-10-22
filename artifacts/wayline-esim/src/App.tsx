import { type ReactNode, useMemo, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useRef } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminConsole } from '@/pages/admin-console';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronRight, CircleHelp, Compass,
  CreditCard, Globe2, Layers3, LockKeyhole, Moon, Search, ShieldCheck, Smartphone, Sun, Users, Wifi, Zap
} from 'lucide-react';
import {
  getGetAdminIntegrationsQueryKey, getGetAdminOverviewQueryKey, getGetCoverageQueryKey,
  getGetPlansQueryKey, useGetAdminIntegrations, useGetAdminOverview, useGetCoverage, useGetPlans
} from '@workspace/api-client-react';
import type { AdminOverview, CoverageRegion, DataPlan, IntegrationStatus } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#43d9f3', colorForeground: '#eaf2fc', colorMutedForeground: '#9aaabd',
    colorDanger: '#fb7185', colorBackground: '#0b1422', colorInput: '#101d2e',
    colorInputForeground: '#eaf2fc', colorNeutral: '#26364a', fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#0b1422] border border-[#26364a] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eaf2fc] font-bold tracking-tight',
    headerSubtitle: 'text-[#9aaabd]',
    socialButtonsBlockButtonText: 'text-[#eaf2fc] font-semibold',
    formFieldLabel: 'text-[#d4deeb] font-semibold',
    footerActionLink: 'text-[#43d9f3] font-bold',
    footerActionText: 'text-[#9aaabd]',
    dividerText: 'text-[#9aaabd]',
    identityPreviewEditButton: 'text-[#43d9f3]',
    formFieldSuccessText: 'text-emerald-300',
    alertText: 'text-rose-200',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border border-[#26364a] bg-[#101d2e] hover:bg-[#17263a]',
    formButtonPrimary: 'bg-[#43d9f3] text-[#07141e] hover:bg-[#8cecff] font-extrabold',
    formFieldInput: 'border-[#26364a] bg-[#101d2e] text-[#eaf2fc]',
    footerAction: 'text-[#9aaabd]',
    dividerLine: 'bg-[#26364a]',
    alert: 'border-rose-400/30 bg-rose-500/10',
    otpCodeFieldInput: 'border-[#26364a] bg-[#101d2e] text-[#eaf2fc]',
    formFieldRow: 'gap-1',
    main: 'text-[#eaf2fc]',
  },
};

const navItems = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/plans', label: 'Data plans', icon: Layers3 },
  { href: '/coverage', label: 'Regions', icon: Globe2 },
  { href: '/install', label: 'Setup guide', icon: Smartphone },
  { href: '/support', label: 'Help & compatibility', icon: CircleHelp },
];
const adminItems = [
  { href: '/admin', label: 'Operations overview', icon: Activity },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/esim-profiles', label: 'eSIM profiles', icon: Smartphone },
  { href: '/admin/telecom-providers', label: 'Telecom providers', icon: Wifi },
  { href: '/admin/networks', label: 'Networks', icon: Globe2 },
  { href: '/admin/data-plans', label: 'Data plans', icon: Layers3 },
  { href: '/admin/orders', label: 'Orders', icon: CreditCard },
  { href: '/admin/crypto-payments', label: 'Crypto payments', icon: LockKeyhole },
  { href: '/admin/recharges', label: 'Recharges', icon: Zap },
  { href: '/admin/support-tickets', label: 'Support tickets', icon: CircleHelp },
  { href: '/admin/staff-roles', label: 'Staff & roles', icon: ShieldCheck },
  { href: '/admin/audit-logs', label: 'Audit logs', icon: Activity },
  { href: '/admin/integrations', label: 'Integrations', icon: LockKeyhole },
];

function Brand() {
  return <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Wayline home">
    <span className="brand-mark"><svg viewBox="0 0 28 28" width="22" height="22" fill="none" aria-hidden="true"><path d="M3 7.5h5.2l5.3 13 5.2-13H24" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.4 15.8h5.2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/></svg></span>
    <span><span className="block text-[15px] font-extrabold tracking-[-.055em] leading-none">wayline</span><span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.2em] opacity-55">travel data, made clear</span></span>
  </Link>;
}

function App() {
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkRouteShell />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

function ClerkRouteShell() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{signIn:{start:{title:'Welcome back',subtitle:'Sign in to your Wayline workspace'}},signUp:{start:{title:'Join Wayline',subtitle:'Create an account to continue'}}}
    routerPush={to=>setLocation(stripBase(to))}
    routerReplace={to=>setLocation(stripBase(to),{replace:true})}
  >
    <ClerkQueryCacheInvalidator />
    <AppShell />
  </ClerkProvider>;
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({user}) => {
    const current = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== current) queryClient.clear();
    previousUser.current = current;
  }), [addListener]);
  return null;
}

function AppShell() {
  const [location] = useLocation();
  const {isLoaded,isSignedIn} = useAuth();
  const {signOut} = useClerk();
  const inAdmin = location.startsWith('/admin');
  const plansQuery = useGetPlans({ query: { queryKey: getGetPlansQueryKey() } });
  const coverageQuery = useGetCoverage({ query: { queryKey: getGetCoverageQueryKey() } });
  const overviewQuery = useGetAdminOverview({ query: { queryKey: getGetAdminOverviewQueryKey(), enabled: inAdmin && !!isSignedIn } });
  const integrationsQuery = useGetAdminIntegrations({ query: { queryKey: getGetAdminIntegrationsQueryKey(), enabled: inAdmin && !!isSignedIn } });
  const plans = plansQuery.data ?? [];
  const regions = coverageQuery.data ?? [];
  const overview = overviewQuery.data;
  const integrations = integrationsQuery.data ?? [];
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('wayline-theme') !== 'light'; } catch { return true; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('wayline-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);
  const routeProps = { plans, regions, overview, integrations, plansQuery, coverageQuery, overviewQuery, integrationsQuery };
  const authRoutes = location.startsWith('/sign-in') || location.startsWith('/sign-up');
  if (authRoutes) return <Switch>
    <Route path="/sign-in/*?"><AuthScreen kind="in" /></Route>
    <Route path="/sign-up/*?"><AuthScreen kind="up" /></Route>
  </Switch>;
  return <div className="app-shell ambient-grid bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="px-6 pb-8 pt-7"><Brand /></div>
      <div className="px-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-sidebar-foreground/40">Explore</p>
        <nav className="space-y-1" aria-label="Main navigation">{navItems.map(item => <SidebarLink key={item.href} {...item} current={location} />)}</nav>
      </div>
      <div className="mx-5 my-6 border-t border-sidebar-border" />
      <div className="px-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-sidebar-foreground/40">Workspace</p>
        <nav className="space-y-1" aria-label="Operations navigation">{adminItems.map(item => <SidebarLink key={item.href} {...item} current={location} />)}</nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-sidebar-border bg-white/[.035] p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> SANDBOX MODE</div>
          <p className="text-[11px] leading-[1.65] text-sidebar-foreground/55">Catalog examples only. No live carrier service or checkout.</p>
        </div>
        <div className="mt-4 flex items-center justify-between px-2 text-[10px] text-sidebar-foreground/35"><span>Wayline eSIM</span><span>v0.1</span></div>
      </div>
    </aside>
    <div className="min-h-[100dvh] lg:pl-[248px]">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1460px] items-center justify-between px-4 sm:px-7 xl:px-10">
          <div className="flex items-center gap-3 lg:hidden"><Brand /></div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><span className="font-medium text-foreground">Wayline</span><ChevronRight size={13}/><span>{pageLabel(location)}</span></div>
          <div className="flex items-center gap-2">
            {isSignedIn ? <button onClick={()=>signOut({redirectUrl:basePath||'/'})} className="rounded-xl border border-border bg-card/70 px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground" data-testid="button-sign-out">Sign out</button> : <Link href="/sign-in" className="rounded-xl border border-border bg-card/70 px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground" data-testid="link-sign-in">Sign in</Link>}
            <span className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Demo environment</span>
            <button type="button" onClick={() => setDark(!dark)} data-testid="button-theme-toggle" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition hover:text-foreground">{dark ? <Sun size={16}/> : <Moon size={16}/>}</button>
          </div>
        </div>
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Mobile navigation">
          {[...navItems, ...adminItems].map(item => <Link key={item.href} href={item.href} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ','-')}`} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${location === item.href ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}><item.icon size={14}/>{item.label}</Link>)}
        </nav>
      </header>
      <main className="mx-auto max-w-[1460px] px-4 pb-16 pt-7 sm:px-7 lg:pt-9 xl:px-10">
        <ErrorBoundary resetKey={location}>
          <Switch>
            <Route path="/"><HomePage {...routeProps}/></Route>
            <Route path="/plans"><PlansPage {...routeProps}/></Route>
            <Route path="/coverage"><CoveragePage {...routeProps}/></Route>
            <Route path="/install"><InstallPage/></Route>
            <Route path="/support"><SupportPage/></Route>
            <Route path="/admin"><AdminAuthRoute isLoaded={isLoaded} isSignedIn={!!isSignedIn}/></Route>
            <Route path="/admin/:module">{params=><AdminAuthRoute moduleId={params.module} isLoaded={isLoaded} isSignedIn={!!isSignedIn}/>}</Route>
            <Route component={NotFound}/>
          </Switch>
        </ErrorBoundary>
        <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-border/70 pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <span>Wayline eSIM <span className="mx-1 opacity-40">/</span> Connectivity, without the guesswork.</span>
          <span className="flex items-center gap-2"><ShieldCheck size={13}/> Privacy-aware by design. No anonymity promises.</span>
        </footer>
      </main>
    </div>
  </div>;
}

function AuthScreen({kind}:{kind:'in'|'up'}) {
  return <div className="ambient-grid flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
    <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,rgba(43,203,230,.11),transparent_40%),radial-gradient(ellipse_at_20%_80%,rgba(126,101,216,.09),transparent_38%)]"/>
    <div className="w-full max-w-[520px]"><div className="mb-6 text-center"><Brand/><p className="mt-4 text-xs text-muted-foreground">{kind==='in'?'Private access to your Wayline workspace.':'Create an account to get started with Wayline.'}</p></div>{kind==='in'?<SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/>:<SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/>}<p className="mx-auto mt-5 max-w-sm text-center text-[10px] leading-5 text-muted-foreground">Wayline is a privacy-conscious travel eSIM service. Account access does not activate telecom or payment services.</p></div>
  </div>;
}

function AdminAuthRoute({moduleId,isLoaded,isSignedIn}:{moduleId?:string;isLoaded:boolean;isSignedIn:boolean}) {
  if (!isLoaded) return <div className="mx-auto max-w-3xl space-y-4"><div className="h-9 w-56 rounded-lg skeleton"/><div className="h-60 rounded-2xl skeleton"/></div>;
  if (!isSignedIn) return <div className="glass-panel mx-auto max-w-xl rounded-2xl p-8 text-center"><LockKeyhole className="mx-auto text-primary" size={22}/><h1 className="mt-4 text-xl font-bold">Sign in to continue</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">The operations console is protected. Authentication is required before the server checks your role.</p><Link href="/sign-in" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Sign in</Link></div>;
  return <AdminConsole moduleId={moduleId}/>;
}

function SidebarLink({ href, label, icon: Icon, current }: { href: string; label: string; icon: typeof Compass; current: string }) {
  const active = current === href;
  return <Link href={href} data-testid={`link-side-${label.toLowerCase().replaceAll(' ','-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${active ? 'bg-cyan-300/10 text-cyan-100 shadow-[inset_2px_0_0_#5fe4f4]' : 'text-sidebar-foreground/65 hover:bg-white/[.045] hover:text-sidebar-foreground'}`}>
    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-cyan-300' : 'opacity-75'}/>{label}
  </Link>;
}

function pageLabel(path: string) {
  return [...navItems, ...adminItems].find(x => x.href === path)?.label ?? 'Overview';
}

type QueryLike = { isLoading: boolean; isError: boolean; refetch: () => unknown };
type SharedProps = { plans: DataPlan[]; regions: CoverageRegion[]; overview?: AdminOverview; integrations: IntegrationStatus[]; plansQuery: QueryLike; coverageQuery: QueryLike; overviewQuery: QueryLike; integrationsQuery: QueryLike };

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.19em] text-primary"><span className="h-px w-5 bg-primary"/>{eyebrow}</div><h1 className="font-display text-[32px] font-semibold leading-[1.12] tracking-[-.055em] sm:text-[40px]">{title}</h1><p className="mt-3 max-w-[650px] text-sm leading-6 text-muted-foreground">{description}</p></div>
    {action}
  </div>;
}

function DemoNotice({ children = 'Demo data only — examples do not represent active carrier coverage, real eSIM credentials, or live prices.' }: { children?: string }) {
  return <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[.055] px-3.5 py-3 text-[11px] leading-[1.6] text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"/><span><strong className="font-semibold text-foreground/85">Sandbox example.</strong> {children}</span></div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton rounded-xl ${className}`} aria-label="Loading content"/>; }
function QueryState({ query, label }: { query: QueryLike; label: string }) {
  if (query.isLoading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2].map(i=><Skeleton key={i} className="h-48"/>)}</div>;
  if (query.isError) return <div className="glass-panel rounded-2xl p-8 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><Activity size={19}/></div><h3 className="font-semibold">Couldn’t load {label}</h3><p className="mt-1 text-sm text-muted-foreground">The service may be unavailable. Your filters are safe.</p><button onClick={() => query.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground" data-testid={`button-retry-${label}`}>Try again</button></div>;
  return null;
}

function HomePage({ plans, regions, plansQuery }: SharedProps) {
  const featured = plans.filter(p => p.featured).slice(0, 3);
  return <div className="page-enter">
    <section className="relative isolate overflow-hidden rounded-[28px] border border-border/70 bg-[#0a1422] px-6 py-9 text-slate-100 shadow-[0_28px_90px_rgba(3,13,29,.24)] sm:px-10 sm:py-12 xl:px-14 xl:py-14">
      <div className="ambient-grid absolute inset-0 -z-10 opacity-80"/>
      <div className="absolute -right-20 -top-32 -z-10 h-[390px] w-[390px] rounded-full bg-cyan-400/[.13] blur-[90px]"/>
      <div className="absolute right-[15%] top-16 -z-10 h-[250px] w-[250px] rounded-full bg-violet-500/[.12] blur-[90px]"/>
      <div className="grid items-center gap-8 xl:grid-cols-[1.15fr_.85fr]">
        <div className="max-w-[660px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/> International data, made legible</span>
          <h1 className="mt-6 font-display text-[42px] font-semibold leading-[1.03] tracking-[-.065em] sm:text-[58px] xl:text-[68px]">Your next trip.<br/><span className="text-cyan-300">A clearer signal.</span></h1>
          <p className="mt-5 max-w-[490px] text-sm leading-7 text-slate-300/75 sm:text-base">Regional data plans, plainly explained. Find a travel-ready option without the carrier maze.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/plans" data-testid="link-browse-plans" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-xs font-extrabold text-[#07141e] transition hover:-translate-y-0.5 hover:bg-cyan-200">Explore demo plans <ArrowRight size={15}/></Link><Link href="/coverage" data-testid="link-explore-regions" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-5 py-3 text-xs font-bold text-white transition hover:bg-white/[.09]">View regions <Globe2 size={15}/></Link></div>
          <div className="mt-7 flex items-center gap-3 text-[11px] text-slate-300/65"><ShieldCheck size={15} className="text-cyan-300"/> Privacy-aware service. No anonymity promises.</div>
        </div>
        <div className="relative mx-auto w-full max-w-[410px]">
          <div className="glass-panel relative rounded-[26px] border-white/10 bg-white/[.055] p-5 text-white shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-300/55">Plan finder</div><div className="mt-1 text-lg font-bold tracking-tight">A simpler way to roam</div></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Compass size={18}/></span></div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"><span className="flex items-center gap-3 text-xs text-slate-300"><Globe2 size={15} className="text-cyan-300"/> Destinations</span><span className="font-mono text-xs text-white">{regions.length || '—'} regions <ChevronDown size={12} className="ml-1 inline"/></span></div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"><span className="flex items-center gap-3 text-xs text-slate-300"><Wifi size={15} className="text-violet-300"/> Data examples</span><span className="font-mono text-xs text-white">{plans.length || '—'} plans</span></div>
            </div>
            <div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[.055] p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-200"><LockKeyhole size={13}/> Sandbox preview</div><p className="mt-1.5 text-[11px] leading-5 text-slate-300/65">No live checkout, network provisioning, or eSIM issuance is enabled.</p></div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#101d2e]/90 px-4 py-3 shadow-xl backdrop-blur md:flex"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-400/10 text-violet-200"><Zap size={15}/></span><span><span className="block text-[10px] text-slate-400">Designed for travel</span><span className="block text-xs font-bold text-white">Clarity comes standard</span></span></div>
        </div>
      </div>
    </section>
    <div className="mt-7 grid gap-4 md:grid-cols-3">
      {[{n:'01', title:'Choose your destination', text:'Compare regional examples by data, validity and price.', icon:Globe2},{n:'02',title:'Check your device',text:'Confirm eSIM support before planning your setup.',icon:Smartphone},{n:'03',title:'Travel with context',text:'Know what is and is not live before you go.',icon:ShieldCheck}].map(x=><div key={x.n} className="glass-panel flex gap-4 rounded-2xl p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><x.icon size={18}/></span><div><div className="mb-1 font-mono text-[9px] tracking-[.18em] text-primary">{x.n} / WAYLINE</div><h3 className="text-sm font-bold tracking-tight">{x.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{x.text}</p></div></div>)}
    </div>
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">A starting point</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Popular plan examples</h2></div><Link href="/plans" className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2" data-testid="link-all-plans">All plans <ArrowRight size={14}/></Link></div>
      <QueryState query={plansQuery} label="plans"/>
      {!plansQuery.isLoading && !plansQuery.isError && (featured.length ? <div className="grid gap-4 md:grid-cols-3">{featured.map(plan=><PlanCard key={plan.id} plan={plan}/>)}</div> : <EmptyState title="Plans are on their way" text="There are no demo plans in the catalog yet."/>)}
      <div className="mt-5"><DemoNotice/></div>
    </section>
    <section className="mt-12 grid gap-5 rounded-3xl border border-border/70 bg-gradient-to-br from-card to-primary/[.045] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-500">Before you depart</div><h2 className="mt-2 text-xl font-bold tracking-[-.04em]">A few minutes of setup. A lot less guesswork.</h2><p className="mt-2 max-w-[560px] text-sm leading-6 text-muted-foreground">Walk through device compatibility, installation basics and what to expect from an eSIM.</p></div><Link href="/install" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs font-bold hover:border-primary/40" data-testid="link-install-guide">Read the guide <ArrowRight size={14}/></Link></section>
  </div>;
}

function PlanCard({ plan }: { plan: DataPlan }) {
  return <article className="glass-panel group relative flex flex-col overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/35">
    {plan.featured && <div className="absolute right-0 top-0 rounded-bl-xl bg-primary/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.14em] text-primary">Popular example</div>}
    <div className="mb-5 flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{plan.region} / {plan.countryCode}</div><h3 className="mt-2 text-lg font-bold tracking-tight">{plan.destination}</h3><p className="mt-1 text-xs text-muted-foreground">{plan.name}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/[.08] text-primary"><Globe2 size={17}/></span></div>
    <div className="flex items-end gap-2 border-b border-border/70 pb-4"><span className="font-display text-4xl font-semibold tracking-[-.06em]">{plan.dataGb}<span className="ml-1 text-base">GB</span></span><span className="mb-1 text-xs text-muted-foreground">for {plan.validityDays} days</span></div>
    <div className="mt-4 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.13em] text-muted-foreground">Demo price</span><span className="font-mono text-lg font-medium">${Number(plan.priceUsd).toFixed(2)} <span className="text-[10px] text-muted-foreground">USD</span></span></div>
    <p className="mt-3 min-h-8 text-[10px] leading-4 text-muted-foreground">{plan.networks?.length ? `Example networks: ${plan.networks.join(', ')}` : 'Network details not listed.'}</p>
    <button type="button" disabled title="Live checkout is unavailable until payment and telecom providers are authorized and configured." className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-[11px] font-bold text-muted-foreground opacity-80" data-testid={`button-checkout-disabled-${plan.id}`}>Checkout unavailable <LockKeyhole size={13}/></button>
    <p className="mt-2 text-center text-[9px] leading-4 text-muted-foreground">Payments and eSIM provisioning are not configured.</p>
  </article>;
}

function PlansPage({ plans, plansQuery }: SharedProps) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('featured');
  const regions = useMemo(() => [...new Set(plans.map(p => p.region))].sort(), [plans]);
  const filtered = useMemo(() => plans.filter(p => {
    const term = search.trim().toLowerCase();
    return (!term || [p.destination,p.name,p.region,p.countryCode].some(s => s.toLowerCase().includes(term))) && (region === 'all' || p.region === region) && (type === 'all' || p.planType === type);
  }).sort((a,b) => sort === 'price-low' ? a.priceUsd-b.priceUsd : sort === 'data-high' ? b.dataGb-a.dataGb : Number(b.featured)-Number(a.featured)), [plans, search, region, type, sort]);
  return <div className="page-enter">
    <PageHeading eyebrow="The plan shelf" title="Find your kind of roaming." description="Browse regional data examples with the details up front. Filter by destination, plan type or price." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><Layers3 size={13} className="text-primary"/>{plans.length} examples</div>}/>
    <div className="glass-panel mb-6 rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_180px_180px_170px]">
        <label className="relative block"><span className="sr-only">Search plans</span><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search destination or region" data-testid="input-search-plans" className="h-11 w-full rounded-xl border border-input bg-background/75 pl-10 pr-3 text-xs outline-none placeholder:text-muted-foreground/70 focus:border-primary"/></label>
        <select value={region} onChange={e=>setRegion(e.target.value)} aria-label="Filter by region" data-testid="select-plan-region" className="h-11 rounded-xl border border-input bg-background/75 px-3 text-xs"><option value="all">All regions</option>{regions.map(r=><option key={r}>{r}</option>)}</select>
        <select value={type} onChange={e=>setType(e.target.value)} aria-label="Filter by plan type" data-testid="select-plan-type" className="h-11 rounded-xl border border-input bg-background/75 px-3 text-xs"><option value="all">All plan types</option><option value="data-only">Data only</option><option value="data-voice-sms">Data, voice & SMS</option></select>
        <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort plans" data-testid="select-plan-sort" className="h-11 rounded-xl border border-input bg-background/75 px-3 text-xs"><option value="featured">Featured first</option><option value="price-low">Price: low to high</option><option value="data-high">Most data</option></select>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{filtered.length} matching {filtered.length === 1 ? 'plan' : 'plans'}</span>{(search || region !== 'all' || type !== 'all') && <button onClick={()=>{setSearch('');setRegion('all');setType('all');}} className="font-bold text-primary hover:underline" data-testid="button-clear-filters">Clear filters</button>}</div>
    </div>
    <QueryState query={plansQuery} label="plans"/>
    {!plansQuery.isLoading && !plansQuery.isError && (filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(plan=><PlanCard key={plan.id} plan={plan}/>)}</div> : <EmptyState title={plans.length ? 'No plans match those filters' : 'No demo plans yet'} text={plans.length ? 'Try a different destination or clear the filters.' : 'Demo plan examples will appear here when available.'} action={plans.length ? ()=>{setSearch('');setRegion('all');setType('all');} : undefined}/>)}
    <div className="mt-6"><DemoNotice/></div>
  </div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: () => void }) {
  return <div className="glass-panel rounded-2xl px-6 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Search size={19}/></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p>{action && <button onClick={action} className="mt-4 text-xs font-bold text-primary hover:underline" data-testid="button-empty-clear">Clear filters</button>}</div>;
}

function CoveragePage({ regions, coverageQuery }: SharedProps) {
  const [term, setTerm] = useState('');
  const filtered = regions.filter(r => `${r.name} ${r.countries.join(' ')}`.toLowerCase().includes(term.toLowerCase()));
  return <div className="page-enter">
    <PageHeading eyebrow="Where the examples point" title="Regions, at a glance." description="A sandbox view of regional plan groupings. These examples are not verified carrier availability."/>
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-[350px] flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search a region or country" aria-label="Search coverage examples" data-testid="input-search-regions" className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-xs outline-none focus:border-primary"/></div><span className="font-mono text-[10px] text-muted-foreground">{regions.length} demo regions</span></div>
        <QueryState query={coverageQuery} label="regions"/>
        {!coverageQuery.isLoading && !coverageQuery.isError && (filtered.length ? <div className="grid gap-3 sm:grid-cols-2">{filtered.map((r,i)=><RegionCard key={r.id} region={r} index={i}/>)}</div> : <EmptyState title={regions.length ? 'No regions found' : 'No region examples yet'} text="Try another search or check back later."/>)}
      </div>
      <aside className="space-y-4">
        <div className="glass-panel rounded-2xl p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Globe2 size={18}/></span><h3 className="mt-4 text-sm font-bold">Regional by design</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">One plan can group multiple destinations. Check the plan details and the final provider terms before relying on any network.</p><Link href="/plans" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary">Browse plans <ArrowRight size={13}/></Link></div>
        <DemoNotice>Country groupings are illustrative only, not live coverage commitments.</DemoNotice>
      </aside>
    </div>
  </div>;
}

function RegionCard({ region, index }: { region: CoverageRegion; index: number }) {
  const [open, setOpen] = useState(false);
  const colors = ['bg-cyan-400/10 text-cyan-500','bg-violet-400/10 text-violet-500','bg-emerald-400/10 text-emerald-500','bg-amber-400/10 text-amber-600'];
  return <article className="glass-panel rounded-2xl p-5 transition hover:border-primary/30">
    <div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[index%colors.length]}`}><Globe2 size={17}/></span><span className="rounded-full border border-border px-2.5 py-1 font-mono text-[9px] text-muted-foreground">DEMO</span></div>
    <h3 className="mt-4 text-base font-bold tracking-tight">{region.name}</h3>
    <div className="mt-1 text-xs text-muted-foreground">{region.countryCount} example {region.countryCount === 1 ? 'country' : 'countries'}</div>
    <button onClick={()=>setOpen(!open)} aria-expanded={open} className="mt-4 flex w-full items-center justify-between border-t border-border/70 pt-3 text-[11px] font-bold text-primary" data-testid={`button-countries-${region.id}`}>{open ? 'Hide countries' : 'View countries'}<ChevronDown size={14} className={`transition-transform ${open?'rotate-180':''}`}/></button>
    {open && <div className="mt-3 flex flex-wrap gap-1.5">{region.countries.map(country=><span key={country} className="rounded-lg bg-muted/70 px-2 py-1 text-[10px] text-muted-foreground">{country}</span>)}</div>}
  </article>;
}

function InstallPage() {
  const [active, setActive] = useState(0);
  const steps = [
    {title:'Check eSIM compatibility',text:'Confirm your phone supports eSIM and is not restricted by a carrier. Compatibility varies by exact model, country of purchase and software version.',icon:Smartphone},
    {title:'Choose a plan for your trip',text:'Review the destination, data allowance, validity window and plan type. Treat this sandbox catalog as an illustration only.',icon:Globe2},
    {title:'Get your installation details',text:'A real provider normally supplies a QR code or activation details after purchase. Wayline does not issue real eSIM credentials in this sandbox.',icon:Layers3},
    {title:'Install before you travel',text:'Follow your device’s cellular settings to add an eSIM. Keep your primary line available and label each line so it is easy to recognize.',icon:Zap},
    {title:'Connect when you arrive',text:'Choose the travel line for mobile data and enable data roaming only if the provider instructs you to. Network selection depends on your plan.',icon:Wifi},
  ];
  return <div className="page-enter">
    <PageHeading eyebrow="A practical guide" title="Set up with confidence." description="The usual eSIM journey, with the important caveats included. No QR codes or activation credentials are generated here."/>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-3">{steps.map((step,i)=><button key={step.title} onClick={()=>setActive(i)} aria-expanded={active===i} className={`glass-panel w-full rounded-2xl p-5 text-left transition ${active===i?'border-primary/40':''}`} data-testid={`button-install-step-${i+1}`}><div className="flex items-center gap-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active===i?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}><step.icon size={17}/></span><span className="min-w-0 flex-1"><span className="block font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Step 0{i+1}</span><span className="mt-1 block text-sm font-bold">{step.title}</span></span><ChevronDown size={16} className={`text-muted-foreground transition-transform ${active===i?'rotate-180':''}`}/></div>{active===i&&<p className="ml-14 mt-3 max-w-[650px] text-xs leading-6 text-muted-foreground">{step.text}</p>}</button>)}</div>
      <aside className="space-y-4"><div className="glass-panel rounded-2xl p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600"><ShieldCheck size={18}/></span><h3 className="mt-4 font-bold">A quick note on privacy</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">An eSIM changes how your device connects to a mobile network. It does not make your activity anonymous. Learn what data your device and provider may handle.</p></div><DemoNotice>There is no live purchase, eSIM issuance, or installation flow in this environment.</DemoNotice></aside>
    </div>
  </div>;
}

function SupportPage() {
  const [device, setDevice] = useState('');
  const [checked, setChecked] = useState(false);
  const [query, setQuery] = useState('');
  const faqs = [
    ['What is an eSIM?','An eSIM is a digital SIM built into a compatible device. A provider can supply a plan profile to install without a physical SIM card.'],
    ['Can I buy or install a plan here?','Not yet. The storefront is a sandbox preview. Checkout, eSIM provisioning, phone number assignment and recharges are not available.'],
    ['Will my phone work?','It depends on the exact model, region and carrier lock status. Use the checker as a starting point, then verify with your device maker and carrier.'],
    ['Does an eSIM make me anonymous?','No. eSIM technology does not promise anonymity. Mobile networks and services may process identifying and usage information.'],
  ];
  const shown = faqs.filter(([q,a])=>`${q} ${a}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-enter">
    <PageHeading eyebrow="We’ll make it clear" title="Help for the road ahead." description="Start with a compatibility check, then explore straightforward answers about eSIMs and this sandbox."/>
    <div className="grid gap-5 xl:grid-cols-[.86fr_1.14fr]">
      <section className="glass-panel rounded-2xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Smartphone size={19}/></span><div><h2 className="font-bold">Device compatibility</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A helpful check, not a definitive device certification.</p></div></div>
        <label className="mt-6 block text-[11px] font-bold text-muted-foreground" htmlFor="device-select">Choose your device family</label>
        <select id="device-select" value={device} onChange={e=>{setDevice(e.target.value);setChecked(false);}} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-xs" data-testid="select-device-family"><option value="">Select a device family</option><option value="iphone">iPhone XS or newer</option><option value="pixel">Google Pixel 3 or newer</option><option value="samsung">Recent Samsung Galaxy flagship</option><option value="other">Other / not sure</option></select>
        <button onClick={()=>setChecked(true)} disabled={!device} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-check-compatibility">Check compatibility</button>
        {checked && <div role="status" className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[.06] p-4"><div className="flex items-center gap-2 text-xs font-bold text-primary"><BadgeCheck size={15}/>{device==='other'?'Needs a closer look':'Often eSIM-capable'}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{device==='other'?'Check the exact model specifications and carrier lock status with your device manufacturer.':'This device family commonly supports eSIM. Exact model, country variant, software and carrier restrictions still matter.'}</p></div>}
        <p className="mt-4 text-[10px] leading-4 text-muted-foreground">For a reliable answer, verify the exact model in your phone settings or with the manufacturer. A device can be eSIM-capable and still be carrier-locked.</p>
      </section>
      <section className="glass-panel rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-500">Frequently asked</div><h2 className="mt-2 text-xl font-bold tracking-[-.04em]">The practical answers.</h2></div><label className="relative block sm:w-[220px]"><span className="sr-only">Search support articles</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search help" data-testid="input-search-support" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"/></label></div>
        <div className="mt-5 divide-y divide-border/70">{shown.map(([question,answer])=><details key={question} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold marker:hidden">{question}<ChevronDown size={14} className="shrink-0 text-muted-foreground transition group-open:rotate-180"/></summary><p className="mt-3 pr-6 text-xs leading-5 text-muted-foreground">{answer}</p></details>)}{!shown.length&&<p className="py-8 text-center text-xs text-muted-foreground">No help articles match that search.</p>}</div>
      </section>
    </div>
    <div className="mt-5"><DemoNotice>Support information is general guidance and does not confirm a plan or network is available.</DemoNotice></div>
  </div>;
}

function AdminPage({ overview, plans, regions, overviewQuery }: SharedProps) {
  const metricCards = overview ? [
    {label:'Catalog plans',value:overview.planCount,detail:'Sandbox examples',icon:Layers3,trend:'Catalog'},
    {label:'Coverage regions',value:overview.coverageRegionCount,detail:'Illustrative groupings',icon:Globe2,trend:'Regions'},
    {label:'Live provisioning',value:overview.liveProvisioningEnabled?'Enabled':'Off',detail:'Provider setup required',icon:Wifi,trend:'Gated'},
    {label:'Live payments',value:overview.livePaymentsEnabled?'Enabled':'Off',detail:'Secure checkout not configured',icon:CreditCard,trend:'Gated'},
  ] : [];
  return <div className="page-enter">
    <PageHeading eyebrow="Read-only workspace" title="Operations, without the noise." description="A lightweight view of catalog readiness and capability gates. This console is read-only; no admin writes or customer records are exposed." action={<Link href="/admin/integrations" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:border-primary/40" data-testid="link-admin-integrations">Integration readiness <ArrowRight size={14}/></Link>}/>
    <QueryState query={overviewQuery} label="overview"/>
    {overviewQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-36"/>)}</div> : overview && <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map((m,i)=><div key={m.label} className="glass-panel rounded-2xl p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/[.09] text-primary"><m.icon size={17}/></span><span className={`rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] ${i<2?'bg-cyan-500/10 text-cyan-600':'bg-violet-500/10 text-violet-500'}`}>{m.trend}</span></div><div className="mt-5 text-2xl font-semibold tracking-[-.05em]">{m.value}</div><div className="mt-1 text-xs font-bold">{m.label}</div><div className="mt-1 text-[10px] text-muted-foreground">{m.detail}</div></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">Environment health</div><h2 className="mt-1 text-lg font-bold tracking-tight">Sandbox status</h2></div><span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/[.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-cyan-600"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500"/> Read only</span></div>
          <div className="mt-5 space-y-3">{[{label:'Catalog endpoint',detail:`${plans.length} plan records available`,ok:!overviewQuery.isError},{label:'Coverage endpoint',detail:`${regions.length} region examples available`,ok:true},{label:'Telecom provisioning',detail:'Disabled until provider authorization',ok:false},{label:'Payment processing',detail:'Disabled until secure setup',ok:false}].map((row,i)=><div key={row.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-3.5 py-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${row.ok?'bg-emerald-500/10 text-emerald-600':'bg-violet-500/10 text-violet-500'}`}>{row.ok?<Check size={15}/>:<LockKeyhole size={14}/>}</span><div className="min-w-0 flex-1"><div className="text-xs font-bold">{row.label}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.detail}</div></div><span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{row.ok?'Available':'Gated'}</span></div>)}</div>
        </section>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111b2b] p-6 text-white"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"/><div className="relative"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-cyan-200"><ShieldCheck size={14}/> Operating principle</div><h2 className="mt-4 text-xl font-bold tracking-[-.04em]">Trust is built in the gaps.</h2><p className="mt-3 text-xs leading-6 text-slate-300/65">We keep live actions gated until the right providers are authorized, secure authentication is configured, and the complete flow can be validated.</p><Link href="/admin/integrations" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-cyan-200 hover:text-cyan-100">Review readiness <ArrowRight size={14}/></Link></div></section>
      </div>
      <div className="mt-5"><DemoNotice>Operational counts describe this sandbox catalog only. No customer, order, payment or provisioning activity is shown.</DemoNotice></div>
    </>}
  </div>;
}

function IntegrationsPage({ integrations, integrationsQuery }: SharedProps) {
  return <div className="page-enter">
    <PageHeading eyebrow="Provider readiness" title="Live connections stay off by default." description="A read-only view of telecom and payment integration status. No credentials are exposed and this page cannot configure providers."/>
    <QueryState query={integrationsQuery} label="integrations"/>
    {integrationsQuery.isLoading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-24"/>)}</div> : <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <section className="space-y-3">{integrations.length ? integrations.map(item=><IntegrationRow key={item.id} item={item}/>) : <EmptyState title="No integration statuses returned" text="Readiness details are unavailable right now."/>}
        <div className="mt-4"><DemoNotice>Provider status is informational. Setup and credential management are not available in this console.</DemoNotice></div>
      </section>
      <aside className="space-y-4"><div className="glass-panel rounded-2xl p-5"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Go-live checklist</div><h3 className="mt-2 text-base font-bold">Before a real plan can work</h3><ul className="mt-4 space-y-3">{['Authorize a telecom provider','Configure secure customer authentication','Authorize a payment provider','Validate issuance, refunds and support'].map((s,i)=><li key={s} className="flex gap-3 text-xs leading-5 text-muted-foreground"><span className="font-mono text-[10px] text-primary">0{i+1}</span>{s}</li>)}</ul></div><div className="rounded-2xl border border-violet-500/15 bg-violet-500/[.045] p-5"><div className="flex items-center gap-2 text-xs font-bold text-violet-600"><LockKeyhole size={15}/> No setup controls here</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">This overview intentionally cannot edit provider settings or enable live actions.</p></div></aside>
    </div>}
  </div>;
}

function IntegrationRow({ item }: { item: IntegrationStatus }) {
  const ready = item.status === 'live-ready';
  const sandbox = item.status === 'sandbox-ready';
  const status = ready ? 'Live ready' : sandbox ? 'Sandbox ready' : 'Not configured';
  const category = item.category === 'telecom' ? 'Telecom provider' : 'Payments';
  return <article className="glass-panel rounded-2xl p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.category==='telecom'?'bg-cyan-500/10 text-cyan-600':'bg-violet-500/10 text-violet-600'}`}>{item.category==='telecom'?<Wifi size={17}/>:<CreditCard size={17}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{item.name}</h3><span className="rounded-full border border-border px-2 py-1 text-[9px] uppercase tracking-[.1em] text-muted-foreground">{category}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p></div><span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] ${ready?'bg-emerald-500/10 text-emerald-600':sandbox?'bg-cyan-500/10 text-cyan-600':'bg-violet-500/10 text-violet-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{status}</span></div></article>;
}

export default App;
