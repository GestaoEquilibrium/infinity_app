// Auth, Perfil, Equipe pages — conectadas ao Supabase real

// ─── TELA DE LOGIN ─────────────────────────────────────────────
const LoginScreen = ({ onSuccess }) => {
  const [mode, setMode] = React.useState('signin'); // signin | signup
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'signin') await window.signIn(email, password);
      else await window.signUp(email, password, { name });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24,
      background: 'radial-gradient(ellipse at 30% 20%, oklch(1 0 0 / 0.75), transparent 55%), radial-gradient(ellipse at 100% 100%, oklch(0 0 0 / 0.12), transparent 50%)',
    }}>
      <div className="glass" style={{
        width: 'min(440px, 100%)', padding: 36, borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'popIn 0.5s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'var(--accent)',
            display: 'grid', placeItems: 'center', color: 'var(--accent-ink)',
            boxShadow: '0 6px 20px oklch(0 0 0 / 0.28)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.8, color: 'var(--ink)' }}>Infinity</div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 500 }}>Gestão financeira clínica</div>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.8, marginBottom: 6 }}>
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 24 }}>
          {mode === 'signin' ? 'Acesse sua clínica para continuar.' : 'Cadastre-se para começar.'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <FormField label="Nome">
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Seu nome completo" style={authInputStyle} />
            </FormField>
          )}
          <FormField label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="voce@clinica.com" style={authInputStyle} autoComplete="email" />
          </FormField>
          <FormField label="Senha">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="••••••••" style={authInputStyle} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </FormField>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'var(--c-neg-soft)',
              color: 'var(--c-neg)', border: '1px solid color-mix(in oklch, var(--c-neg) 30%, transparent)',
            }}>⚠ {error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '14px 22px', borderRadius: 'var(--r-sm)',
            background: 'var(--accent)',
            color: 'var(--accent-ink)', fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
            boxShadow: '0 8px 24px oklch(0 0 0 / 0.25)',
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}>
            {loading ? 'Processando...' : (mode === 'signin' ? 'Entrar' : 'Criar conta')}
          </button>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--ink-mute)' }}>
            {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
              {mode === 'signin' ? 'Cadastrar' : 'Entrar'}
            </button>
          </div>

          <button type="button" onClick={() => onSuccess?.({ demo: true })} style={{
            marginTop: 4, padding: '10px', fontSize: 12, color: 'var(--ink-mute)', fontWeight: 500,
          }}>
            Continuar em modo demonstração →
          </button>
        </form>
      </div>
    </div>
  );
};
const authInputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  border: '1.5px solid var(--line)', background: 'var(--bg-alt)',
  fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
  transition: 'border 0.2s',
};
const FormField = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    {children}
  </label>
);

// ─── PÁGINA PERFIL ─────────────────────────────────────────────
const PerfilPage = () => {
  const { user, profile, refresh } = window.useAuth();
  const [name, setName] = React.useState(profile?.name || '');
  const [email, setEmail] = React.useState(profile?.email || user?.email || '');
  const [phone, setPhone] = React.useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = React.useState(profile?.avatar_url || '');
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savedToast, setSavedToast] = React.useState('');
  const photoInputRef = React.useRef();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setSavedToast('⚠ Selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { setSavedToast('⚠ Imagem muito grande (máx 2MB)'); return; }
    setUploadingPhoto(true);
    try {
      // Converter para base64 e usar como data URL (sem Supabase Storage)
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        setAvatarUrl(dataUrl);
        // Salvar automaticamente ao trocar foto
        if (user?.id && profile?.company_id) {
          try {
            await window.updateProfile(user.id, { avatar_url: dataUrl });
            await refresh();
            setSavedToast('✓ Foto atualizada');
            setTimeout(() => setSavedToast(''), 2400);
          } catch (err) {
            setSavedToast('⚠ Erro ao salvar foto: ' + err.message);
          }
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setSavedToast('⚠ Erro ao processar imagem');
      setUploadingPhoto(false);
    }
  };
  const [pwd, setPwd] = React.useState({ novo: '', conf: '' });
  const [pwdState, setPwdState] = React.useState('');
  const [prefs, setPrefs] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('infinity-prefs-v1')) || { theme: 'light', notif_email: true, notif_push: false, idioma: 'pt-BR' }; }
    catch { return { theme: 'light', notif_email: true, notif_push: false, idioma: 'pt-BR' }; }
  });
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || user?.email || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  React.useEffect(() => {
    if (profile?.company_id && user?.id) {
      window.fetchAuditLog(profile.company_id, 20).then(rows => {
        setLogs(rows.filter(r => r.user_id === user.id));
      }).catch(() => {});
    }
  }, [profile?.company_id, user?.id]);

  const savePrefs = (p) => {
    setPrefs(p);
    localStorage.setItem('infinity-prefs-v1', JSON.stringify(p));
  };

  const saveProfile = async () => {
    if (!user?.id) { setSavedToast('Modo demo — alterações não serão salvas'); return; }
    setSavingProfile(true);
    try {
      await window.updateProfile(user.id, { name, avatar_url: avatarUrl });
      await window.logAction(profile.company_id, user.id, 'update', 'profiles', user.id, { name, avatar_url: avatarUrl });
      await refresh();
      setSavedToast('✓ Perfil atualizado');
      setTimeout(() => setSavedToast(''), 2400);
    } catch (e) {
      setSavedToast('⚠ ' + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    if (pwd.novo !== pwd.conf) { setPwdState('As senhas não conferem.'); return; }
    if (pwd.novo.length < 6) { setPwdState('Senha precisa de 6+ caracteres.'); return; }
    setPwdState('Salvando...');
    try {
      await window.updatePassword(pwd.novo);
      setPwdState('✓ Senha atualizada');
      setPwd({ novo: '', conf: '' });
      setTimeout(() => setPwdState(''), 2400);
    } catch (err) {
      setPwdState('⚠ ' + err.message);
    }
  };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <PageHeader title="Meu perfil" subtitle="Dados pessoais, senha e preferências" />

      <TiltCard interactive={false} padding={28}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Avatar com foto ou iniciais */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => photoInputRef.current?.click()}>
              {avatarUrl && !avatarUrl.startsWith('http://placeholder') ? (
                <img src={avatarUrl} alt="foto" style={{
                  width: 96, height: 96, borderRadius: 32, objectFit: 'cover',
                  border: '3px solid var(--accent)',
                  boxShadow: '0 4px 16px oklch(0 0 0 / 0.2)',
                }} onError={() => setAvatarUrl('')} />
              ) : (
                <Avatar initials={(name || email || '??').slice(0, 2).toUpperCase()} size={96} color="var(--g-7)" />
              )}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--accent-ink)',
                display: 'grid', placeItems: 'center',
                border: '2px solid var(--surface)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {uploadingPhoto ? (
                  <span style={{ fontSize: 10, animation: 'spin 1s linear infinite' }}>⟳</span>
                ) : (
                  <Icon name="edit" size={12} stroke={2.5} />
                )}
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Clique para trocar foto</span>
          </div>
          <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} style={authInputStyle} /></FormField>
            <FormField label="E-mail"><input value={email} disabled style={{ ...authInputStyle, opacity: 0.7 }} /></FormField>
            <FormField label="Telefone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 9..." style={authInputStyle} /></FormField>
            <FormField label="Cargo">
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-alt)', border: '1.5px solid var(--line)' }}>
                <Pill color={profile?.role === 'admin' ? 'var(--ink)' : profile?.role === 'editor' ? 'var(--ink-soft)' : 'var(--ink-mute)'}>
                  {roleLabel(profile?.role || 'viewer')}
                </Pill>
              </div>
            </FormField>
          </div>
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          {savedToast && <span style={{ fontSize: 13, color: savedToast.startsWith('⚠') ? 'var(--c-neg)' : 'var(--c-pos)', fontWeight: 600 }}>{savedToast}</span>}
          <Btn variant="primary" icon="check" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar alterações'}</Btn>
        </div>
      </TiltCard>

      {/* Trocar senha */}
      <TiltCard interactive={false} padding={28}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Trocar senha</h3>
        <form onSubmit={changePwd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <FormField label="Nova senha">
            <input type="password" value={pwd.novo} onChange={(e) => setPwd({ ...pwd, novo: e.target.value })} style={authInputStyle} />
          </FormField>
          <FormField label="Confirmar senha">
            <input type="password" value={pwd.conf} onChange={(e) => setPwd({ ...pwd, conf: e.target.value })} style={authInputStyle} />
          </FormField>
          <Btn variant="secondary" icon="check" type="submit">Atualizar</Btn>
        </form>
        {pwdState && <div style={{ marginTop: 10, fontSize: 13, color: pwdState.startsWith('⚠') ? 'var(--c-neg)' : 'var(--ink-soft)', fontWeight: 500 }}>{pwdState}</div>}
      </TiltCard>

      {/* Preferências */}
      <TiltCard interactive={false} padding={28}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Preferências</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PrefRow label="Tema escuro" desc="Reduz brilho e cansaço visual">
            <Toggle value={prefs.theme === 'dark'} onChange={(v) => savePrefs({ ...prefs, theme: v ? 'dark' : 'light' })} />
          </PrefRow>
          <PrefRow label="Notificações por e-mail" desc="Resumos semanais e alertas de contas vencendo">
            <Toggle value={prefs.notif_email} onChange={(v) => savePrefs({ ...prefs, notif_email: v })} />
          </PrefRow>
          <PrefRow label="Notificações push" desc="Avisos em tempo real no navegador">
            <Toggle value={prefs.notif_push} onChange={(v) => savePrefs({ ...prefs, notif_push: v })} />
          </PrefRow>
          <PrefRow label="Idioma" desc="Define formatação de datas e números">
            <select value={prefs.idioma} onChange={(e) => savePrefs({ ...prefs, idioma: e.target.value })} style={{ ...authInputStyle, width: 180, padding: '8px 12px', fontSize: 13 }}>
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </PrefRow>
        </div>
      </TiltCard>

      {/* Histórico / logs */}
      <TiltCard interactive={false} padding={28}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Histórico de ações</h3>
        {logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
            Nenhuma ação registrada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: i < logs.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-alt)', color: 'var(--ink-soft)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="pulse" size={14} stroke={2.4} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{l.action} · {l.table_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }} className="mono">
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TiltCard>
    </div>
  );
};

const PrefRow = ({ label, desc, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{desc}</div>
    </div>
    {children}
  </div>
);
const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{
    width: 46, height: 26, borderRadius: 13,
    background: value ? 'var(--accent)' : 'var(--line-strong)',
    position: 'relative', transition: 'background 0.25s', cursor: 'pointer',
  }}>
    <span style={{
      position: 'absolute', top: 3, left: value ? 23 : 3,
      width: 20, height: 20, borderRadius: 10, background: '#fff',
      transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    }} />
  </button>
);

const roleLabel = (r) => ({ admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador', financeiro: 'Financeiro' })[r] || r;
const ROLES = [
  { v: 'admin', l: 'Administrador', c: 'var(--ink)', desc: 'Acesso total' },
  { v: 'editor', l: 'Editor / Financeiro', c: 'var(--ink-soft)', desc: 'Lança e edita' },
  { v: 'viewer', l: 'Visualizador', c: 'var(--ink-mute)', desc: 'Somente leitura' },
];

// ─── PÁGINA EQUIPE ─────────────────────────────────────────────
const EquipePage = () => {
  const { user, profile } = window.useAuth();
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [audit, setAudit] = React.useState([]);
  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('editor');
  const [inviteStatus, setInviteStatus] = React.useState('');

  const isAdmin = profile?.role === 'admin';
  const companyId = profile?.company_id;

  const loadMembers = React.useCallback(async () => {
    // Aguarda profile estar disponível
    if (!companyId) {
      setLoading(true);
      return;
    }
    setLoading(true);
    try {
      const rows = await window.listTeam(companyId);
      setMembers(Array.isArray(rows) ? rows : []);
    } catch (e) { console.warn('loadMembers error:', e); }
    finally { setLoading(false); }
  }, [companyId]);

  // Recarrega quando companyId chega (após login) ou muda
  React.useEffect(() => { loadMembers(); }, [loadMembers]);

  // Também recarrega quando a página recebe foco (para pegar novos membros)
  React.useEffect(() => {
    const onFocus = () => { if (companyId) loadMembers(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [companyId, loadMembers]);

  React.useEffect(() => {
    if (companyId) window.fetchAuditLog(companyId, 30).then(setAudit).catch(() => {});
  }, [companyId]);

  const invite = async (e) => {
    e.preventDefault();
    setInviteStatus('Processando...');
    try {
      const res = await window.inviteMember(inviteEmail, inviteRole, companyId);
      if (res.status === 'linked') {
        setInviteStatus(`✓ ${inviteEmail} adicionado à equipe!`);
        setInviteEmail('');
        await loadMembers();
        setTimeout(() => { setShowInvite(false); setInviteStatus(''); }, 1800);
      }
    } catch (err) {
      // Mostrar erro real completo para diagnóstico
      setInviteStatus('⚠ Erro: ' + err.message);
    }
  };

  const [roleMsg, setRoleMsg] = React.useState(''); // feedback de mudança

  const changeRole = async (m, role) => {
    setRoleMsg('');
    // Optimistic update
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role } : x));
    try {
      const res = await window.updateMemberRole(m.id, role);
      // Supabase retorna [] quando a RLS bloqueia (nenhuma linha afetada) em vez de erro HTTP
      if (!res || (Array.isArray(res) && res.length === 0)) {
        throw new Error('Nenhuma linha foi atualizada. Verifique se a migration 002_rbac_fix_and_rh.sql foi aplicada no Supabase.');
      }
      await window.logAction(companyId, user.id, 'role_changed', 'profiles', m.id, { old: m.role, new: role });
      setRoleMsg(`✓ Cargo de ${m.name || m.email} atualizado para ${roleLabel(role)}.`);
      setTimeout(() => setRoleMsg(''), 4000);
      loadMembers();
    } catch (err) {
      setRoleMsg('⚠ Falha ao atualizar: ' + (err.message || 'permissão negada'));
      // Reverte optimistic
      loadMembers();
    }
  };
  const removeOne = async (m) => {
    if (!confirm(`Remover ${m.name || m.email}?`)) return;
    await window.removeMember(m.id);
    await window.logAction(companyId, user.id, 'member_removed', 'profiles', m.id, { email: m.email });
    loadMembers();
  };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Equipe" subtitle="Membros, permissões e auditoria"
        action={isAdmin ? <Btn variant="primary" icon="plus" onClick={() => setShowInvite(true)}>Convidar</Btn> : null} />

      {/* Matriz de permissões */}
      <TiltCard interactive={false} padding={24}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Permissões por cargo</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: 10, fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cargo</th>
                {['dashboard', 'contas', 'compras', 'agenda', 'relatorios', 'equipe'].map(p => (
                  <th key={p} style={{ textAlign: 'center', padding: 10, fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.v} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: 12 }}><Pill color={r.c}>{r.l}</Pill> <span style={{ fontSize: 11, color: 'var(--ink-mute)', marginLeft: 6 }}>{r.desc}</span></td>
                  {['dashboard', 'contas', 'compras', 'agenda', 'relatorios', 'equipe'].map(p => (
                    <td key={p} style={{ textAlign: 'center', padding: 12 }}>
                      {window.canAccess(r.v, p)
                        ? <span style={{ color: 'var(--c-pos)', fontSize: 18 }}>✓</span>
                        : <span style={{ color: 'var(--ink-mute)', fontSize: 14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TiltCard>

      {/* Lista de membros */}
      <TiltCard interactive={false} padding={0}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Membros ({members.length})</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {roleMsg && (
              <span style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 999,
                background: roleMsg.startsWith('✓') ? 'var(--c-pos-soft)' : 'var(--c-neg-soft)',
                color: roleMsg.startsWith('✓') ? 'var(--c-pos)' : 'var(--c-neg)',
                fontWeight: 600,
              }}>{roleMsg}</span>
            )}
            {loading && <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Carregando…</span>}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Nome', 'E-mail', 'Cargo', 'Entrou em', ''].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 4 ? 'right' : 'left',
                  padding: '12px 22px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                  color: 'var(--ink-mute)', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <td style={{ padding: '14px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserAvatar profile={m} name={m.name || m.email} size={36} color={i % 3 === 0 ? 'var(--g-8)' : i % 3 === 1 ? 'var(--g-7)' : 'var(--g-6)'} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.name || '—'}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 22px', fontSize: 13, color: 'var(--ink-soft)' }}>{m.email}</td>
                <td style={{ padding: '14px 22px' }}>
                  {isAdmin && m.id !== user?.id ? (
                    <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} style={{ ...authInputStyle, width: 180, padding: '7px 12px', fontSize: 12 }}>
                      {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  ) : <Pill color={m.role === 'admin' ? 'var(--ink)' : m.role === 'editor' ? 'var(--ink-soft)' : 'var(--ink-mute)'}>{roleLabel(m.role)}</Pill>}
                </td>
                <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--ink-mute)' }} className="mono">{m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                <td style={{ padding: '14px 22px', textAlign: 'right' }}>
                  {isAdmin && m.id !== user?.id && (
                    <button onClick={() => removeOne(m)} style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      color: 'var(--c-neg)',
                      background: 'var(--c-neg-soft)',
                    }}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && members.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                Nenhum membro encontrado. {!companyId && 'Faça login para visualizar.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </TiltCard>

      {/* Audit trail */}
      <TiltCard interactive={false} padding={24}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Atividade recente</h3>
        {audit.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>Sem registros de auditoria.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
            {audit.map((l, i) => {
              const who = members.find(m => m.id === l.user_id);
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < audit.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <UserAvatar profile={who} name={who?.name || who?.email} size={32} color="var(--g-6)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                      <strong>{who?.name || who?.email || 'Usuário'}</strong> · {l.action} em <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{l.table_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-mute)' }} className="mono">{new Date(l.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TiltCard>

      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500, background: 'oklch(0 0 0 / 0.45)', backdropFilter: 'blur(6px)',
          display: 'grid', placeItems: 'center', padding: 30, animation: 'fadeIn 0.2s ease both',
        }} onClick={() => setShowInvite(false)}>
          <form onSubmit={invite} onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--surface-solid)', borderRadius: 'var(--r-lg)', padding: 28, width: 'min(440px, 100%)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column', gap: 14,
            animation: 'popIn 0.3s cubic-bezier(.22,1,.36,1) both',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Convidar membro</h3>
            <FormField label="E-mail">
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required
                placeholder="colega@clinica.com" style={authInputStyle} autoFocus />
            </FormField>
            <FormField label="Cargo">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={authInputStyle}>
                {ROLES.map(r => <option key={r.v} value={r.v}>{r.l} — {r.desc}</option>)}
              </select>
            </FormField>
            {inviteStatus && <div style={{ fontSize: 13, color: inviteStatus.startsWith('⚠') ? 'var(--c-neg)' : 'var(--c-pos)', fontWeight: 500 }}>{inviteStatus}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="secondary" onClick={() => setShowInvite(false)} type="button">Cancelar</Btn>
              <Btn variant="primary" icon="check" type="submit">Enviar convite</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { LoginScreen, PerfilPage, EquipePage, FormField, Toggle, roleLabel, ROLES });
