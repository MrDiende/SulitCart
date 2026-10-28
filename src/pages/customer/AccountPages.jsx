import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CircleUserRound, LogOut, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import Alert, { useAlert } from "../../components/Alert";
import { checkoutLoginPath } from "../../components/RequireCustomerCheckout";
import usePersistentDraft from "../../hooks/usePersistentDraft";
import { Button, EmptyState, Field, PageTitle, PasswordInput, Surface, TextInput } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import "../../css/AccountPages.css";

const goToRoleHome = (role) => role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/profile";

export function LoginPage() {
  const { login, user, canCheckout } = useStore();
  const { notify, dismiss } = useAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToCheckout = searchParams.get("redirect") === "/checkout";
  const [form, setForm, clearDraft, draftError] = usePersistentDraft("sulitcart:login-draft", { email: "" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const update = (key) => (event) => {
    if (key === "password") setPassword(event.target.value);
    else setForm((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setError("");
    try {
      const result = await login(form.email.trim(), password);
      if (result.error) { setError(result.error); return; }
      clearDraft();
      setPassword("");
      dismiss("checkout-sign-in");
      notify("Signed in successfully.", { id: "account-session" });
      navigate(returnToCheckout && result.user.role === "customer" ? "/checkout" : goToRoleHome(result.user.role), { replace: true });
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };
  if (user) return <Navigate to={returnToCheckout && canCheckout ? "/checkout" : goToRoleHome(user.role)} replace />;
  return <div className="auth-page">
    <div className="auth-feature">
      <div className="auth-feature__icon"><ShieldCheck size={21} /></div>
      <p className="auth-feature__eyebrow">A simpler way to shop local</p>
      <h1 className="auth-feature__title">Your neighborhood shop, right here.</h1>
      <p className="auth-feature__description">Sign in to follow your orders and keep your favorite everyday products close.</p>
      <div className="auth-feature__location"><MapPin size={16} /> Serving Cabanatuan City and Nueva Ecija</div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel__header"><p className="auth-panel__eyebrow">Welcome back</p><h1 className="auth-panel__title">Sign in to SulitCart</h1><p className="auth-panel__description">Enter your account details to continue.</p></div>
      <form onSubmit={submit} className="auth-form">
        <Alert message={draftError} type="warning" />
        <Field label="Email address"><TextInput type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required /></Field>
        <Field label="Password"><PasswordInput autoComplete="current-password" value={password} onChange={update("password")} placeholder="Enter your password" required /></Field>
        <Alert message={error} type="error" onDismiss={() => setError("")} />
        <Button type="submit" size="lg" className="ui-button--full" disabled={signingIn}>{signingIn ? "Signing in..." : "Sign in"}<ArrowRight size={16} /></Button>
      </form>
      <p className="auth-panel__switch">New to SulitCart? <Link to={returnToCheckout ? "/register?redirect=/checkout" : "/register"}>Create account</Link></p>
    </div>
  </div>;
}

export function RegisterPage() {
  const { register, user, canCheckout } = useStore();
  const { notify, dismiss } = useAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToCheckout = searchParams.get("redirect") === "/checkout";
  const [form, setForm, clearDraft, draftError] = usePersistentDraft("sulitcart:registration-draft", { name: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const update = (key) => (event) => {
    if (key === "password" || key === "confirm") setPasswordForm((current) => ({ ...current, [key]: event.target.value }));
    else setForm((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) { setError("Passwords do not match."); return; }
    const result = await register({ ...form, ...passwordForm });
    if (result.error) { setError(result.error); return; }
    clearDraft();
    dismiss("checkout-sign-in");
    notify("Account created. You are now signed in.", { id: "account-session" });
    navigate(returnToCheckout ? "/checkout" : "/profile", { replace: true });
  };
  if (user) return <Navigate to={returnToCheckout && canCheckout ? "/checkout" : goToRoleHome(user.role)} replace />;
  return <div className="auth-page">
    <div className="auth-feature auth-feature--register"><div className="auth-feature__icon"><UserRound size={21} /></div><p className="auth-feature__eyebrow">Make it yours</p><h1 className="auth-feature__title">Your local favorites, all in one place.</h1><p className="auth-feature__description">Create an account to place orders and keep track of delivery updates.</p></div>
    <div className="auth-panel">
      <div className="auth-panel__header auth-panel__header--register"><p className="auth-panel__eyebrow">Join the neighborhood</p><h1 className="auth-panel__title">Create your account</h1><p className="auth-panel__description">A few details and you're ready to shop.</p></div>
      <form onSubmit={submit} className="auth-form auth-form--register">
        <Alert message={draftError} type="warning" />
        <Field label="Full name"><TextInput value={form.name} onChange={update("name")} placeholder="Your full name" autoComplete="name" required /></Field>
        <Field label="Email address"><TextInput type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" autoComplete="email" required /></Field>
        <Field label="Phone number"><TextInput type="tel" value={form.phone} onChange={update("phone")} placeholder="09XX XXX XXXX" autoComplete="tel" required /></Field>
        <div className="auth-form__passwords"><Field label="Password" hint="At least 8 characters"><PasswordInput value={passwordForm.password} onChange={update("password")} autoComplete="new-password" required /></Field><Field label="Confirm password"><PasswordInput value={passwordForm.confirm} onChange={update("confirm")} autoComplete="new-password" required /></Field></div>
        <Alert message={error} type="error" onDismiss={() => setError("")} />
        <Button type="submit" size="lg" className="ui-button--full">Create account <ArrowRight size={16} /></Button>
      </form>
      <p className="auth-panel__switch">Already have an account? <Link to={returnToCheckout ? checkoutLoginPath : "/login"}>Sign in</Link></p>
    </div>
  </div>;
}

export function ProfilePage() {
  const { user, updateProfile, logout } = useStore();
  const { notify, dismiss } = useAlert();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm, clearDraft, draftError] = usePersistentDraft(`sulitcart:profile-draft:${user?.id || "anonymous"}`, { name: user?.name || "", email: user?.email || "", phone: user?.phone || "", address: user?.address || "" });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updatePassword = (key) => (event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }));
  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (passwordForm.password.length < 8) { setPasswordError("Use a password with at least 8 characters."); return; }
    if (passwordForm.password !== passwordForm.confirm) { setPasswordError("Passwords do not match."); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    setChangingPassword(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordForm({ password: "", confirm: "" });
    setPasswordSaved(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    const result = await updateProfile(form);
    if (result?.error) { notify(result.error, { type: "error" }); return; }
    clearDraft();
    setEditing(false);
    setSaved(true);
  };
  if (!user) return <div className="profile-sign-in"><EmptyState icon={CircleUserRound} title="Sign in to view your profile" description="Access your details and keep your orders in one place." action={<Link to="/login"><Button>Sign in</Button></Link>} /></div>;
  return <div className="profile-page">
    <PageTitle eyebrow="Your account" title="Profile" description="Manage your contact and delivery details." action={<Button variant="secondary" onClick={() => { logout(); dismiss("checkout-sign-in"); notify("Signed out successfully.", { id: "account-session" }); navigate("/", { replace: true }); }}>Log out <LogOut size={15} /></Button>} />
    <div className="profile-grid">
      <Surface className="profile-details"><div className="profile-details__header"><div><h2>Personal details</h2><p>Used for order and delivery updates.</p></div>{!editing && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit profile</Button>}</div>
        <Alert message={saved ? "Profile saved." : ""} onDismiss={() => setSaved(false)} />
        {editing ? <form onSubmit={submit} className="profile-form"><Alert message={draftError} type="warning" /><Field label="Full name"><TextInput value={form.name} onChange={update("name")} required /></Field><Field label="Email address"><TextInput value={form.email} type="email" onChange={update("email")} required /></Field><Field label="Phone number"><TextInput value={form.phone} onChange={update("phone")} type="tel" /></Field><Field label="Delivery address"><TextInput value={form.address} onChange={update("address")} placeholder="Add your usual delivery address" /></Field><div className="profile-form__actions"><Button type="submit">Save changes</Button><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div></form>
          : <div className="profile-details__list">{[[UserRound, "Full name", form.name], [Mail, "Email address", form.email], [Phone, "Phone number", form.phone || "Not added"], [MapPin, "Delivery address", form.address || "Add an address at checkout"]].map(([Icon, label, value]) => <div key={label} className="profile-details__item"><Icon size={16} /><div><p className="profile-details__label">{label}</p><p className="profile-details__value">{value}</p></div></div>)}</div>}
      </Surface>
      <Surface className="profile-details profile-password">
        <div className="profile-details__header"><div><h2>Change password</h2><p>Choose a new password for your SulitCart account.</p></div></div>
        {passwordSaved && <Alert message="Password changed successfully." onDismiss={() => setPasswordSaved(false)} />}
        <Alert message={passwordError} type="error" onDismiss={() => setPasswordError("")} />
        <form onSubmit={submitPassword} className="profile-form">
          <Field label="New password" hint="At least 8 characters"><PasswordInput value={passwordForm.password} onChange={updatePassword("password")} autoComplete="new-password" required /></Field>
          <Field label="Confirm new password"><PasswordInput value={passwordForm.confirm} onChange={updatePassword("confirm")} autoComplete="new-password" required /></Field>
          <div className="profile-form__actions"><Button type="submit" disabled={changingPassword}>{changingPassword ? "Updating password..." : "Update password"}</Button></div>
        </form>
      </Surface>
    </div>
  </div>;
}