import { useState } from "react";
import { signOut, User } from "firebase/auth";
import { collection, addDoc, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import logoRfm from "@/assets/logo_buhsab.png";
import { Shell } from "@/components/layout/Shell";
import { AREAS } from "@/constants";
import { DEMO_MATERIAL_REQUESTS, DEMO_REPORTS, DEMO_USERS } from "@/data/demo";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { SplashScreen } from "@/features/auth/SplashScreen";
import { PerfilScreen } from "@/features/auth/PerfilScreen";
import { DetalleScreen } from "@/features/reportes/DetalleScreen";
import { HistorialScreen } from "@/features/reportes/HistorialScreen";
import { HomeScreen } from "@/features/reportes/HomeScreen";
import { MantenimientoScreen } from "@/features/reportes/MantenimientoScreen";
import { NuevaFallaScreen } from "@/features/reportes/NuevaFallaScreen";
import { AdminMaterialHistoryScreen } from "@/features/material/AdminMaterialHistoryScreen";
import { AdminMaterialScreen } from "@/features/material/AdminMaterialScreen";
import { UsuariosListaScreen } from "@/features/usuarios/UsuariosListaScreen";
import { UsuariosScreen } from "@/features/usuarios/UsuariosScreen";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { useFirebaseSync } from "@/hooks/useFirebaseSync";
import { useAndroidBackButton, useStatusBarStyle } from "@/hooks/useNative";
import type { AppUser, Category, MaterialRequest, Report, Role, Screen, Tab } from "@/types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("docente");
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [tab, setTab] = useState<Tab>("home");
  const [reports, setReports] = useState<Report[]>(firebaseConfigured ? [] : DEMO_REPORTS);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(firebaseConfigured ? [] : DEMO_MATERIAL_REQUESTS);
  const [appUsers, setAppUsers] = useState<AppUser[]>(firebaseConfigured ? [] : DEMO_USERS);
  const [extraSpaces, setExtraSpaces] = useState<string[]>([]);
  const [sessionName, setSessionName] = useState("");
  // Demo mode user substitute
  const [demoUser] = useState({ uid: "demo-uid", email: "demo@buhsab.mx", displayName: "Demo" });

  useFirebaseSync({ setUser, setAuthLoading, setScreen, setAppUsers, setExtraSpaces, setMaterialRequests, setReports });
  useStatusBarStyle();
  useAndroidBackButton(handleHardwareBack);

  const effectiveUser = firebaseConfigured ? user : (demoUser as unknown as User);

  function handleLogin(u: User | null, r: Role, email?: string) {
    setUser(u);
    setSessionName(u?.displayName || (u?.email ?? email ?? "").split("@")[0]);
    setRole(r);
    setScreen(r === "tecnico" ? { name: "mantenimiento" } : r === "admin" ? { name: "admin" } : { name: "home" });
    setTab("home");
  }

  async function handleAddSpace(name: string) {
    const clean = name.trim();
    if (!clean || [...AREAS, ...extraSpaces].includes(clean)) return;
    if (firebaseConfigured && db) {
      await addDoc(collection(db, "spaces"), { name: clean, createdAt: serverTimestamp() });
    } else {
      setExtraSpaces((current) => [...current, clean]);
    }
  }

  async function handleRequestStatus(id: string, status: "Aprobada" | "Rechazada" | "Cancelada") {
    if (firebaseConfigured && db) {
      await updateDoc(doc(db, "materialRequests", id), { status });
    } else {
      setMaterialRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    }
  }

  async function handleAddTechnician(email: string, temporaryPassword: string, role: "tecnico" | "admin") {
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      email,
      role,
      temporaryPassword,
    };
    if (firebaseConfigured && db) {
      const created = await addDoc(collection(db, "users"), {
        email,
        role,
        temporaryPassword,
        createdAt: serverTimestamp(),
      });
      setAppUsers((current) => [...current, { ...newUser, id: created.id }]);
    } else {
      setAppUsers((current) => [...current, newUser]);
    }
  }

  async function handleDeleteUser(id: string) {
    if (firebaseConfigured && db) {
      await deleteDoc(doc(db, "users", id));
    }
    setAppUsers((current) => current.filter((appUser) => appUser.id !== id));
  }

  async function handleCancelReportByTeacher(id: string) {
    if (firebaseConfigured && db) {
      await updateDoc(doc(db, "reports", id), { status: "Cancelado" });
    }
    setReports((current) => current.map((report) => report.id === id ? { ...report, status: "Cancelado" } : report));
  }

  async function handleLogout() {
    if (firebaseConfigured && auth) await signOut(auth);
    setUser(null);
    setScreen({ name: "login" });
    setTab("home");
  }

  function handleTab(t: Tab) {
    setTab(t);
    if (t === "home") setScreen(role === "tecnico" ? { name: "mantenimiento" } : role === "admin" ? { name: "admin" } : { name: "home" });
    else if (t === "usuarios" && role === "admin") setScreen({ name: "usuarios" });
    else if (t === "reportes") setScreen({ name: "historial" });
    else if (t === "perfil") setScreen({ name: "perfil" });
  }

  // Botón "atrás" de Android: regresa a la pantalla anterior; devuelve false si debe cerrar la app
  function handleHardwareBack(): boolean {
    if (showSplash) { setShowSplash(false); return true; }
    switch (screen.name) {
      case "nueva":
        setScreen(screen.returnTo === "admin" ? { name: "admin" } : { name: "home" });
        return true;
      case "detalle":
        setScreen(screen.returnTo === "historial" ? { name: "historial" } : screen.returnTo === "admin-fallas" ? { name: "admin-fallas" } : screen.returnTo === "admin" ? { name: "admin" } : { name: "mantenimiento" });
        return true;
      case "admin-fallas":
      case "admin-materiales":
      case "admin-apoyos":
      case "admin-materiales-historial":
        setScreen({ name: "admin" });
        return true;
      case "usuarios-list":
        setScreen({ name: "usuarios" });
        return true;
      case "historial":
      case "perfil":
      case "usuarios":
        handleTab("home");
        return true;
      default:
        return false; // login, inicio de cada rol: cerrar la app
    }
  }

  // Siguiente folio consecutivo (solo se usa en modo demo)
  const nextFolio = String(reports.reduce((max, r) => Math.max(max, Number(r.folio) || 0), 0) + 1);

  const selectedReport = screen.name === "detalle"
    ? reports.find((r) => r.id === (screen as { name: "detalle"; reportId: string }).reportId)
    : undefined;

  if (showSplash) {
    return (
      <Shell>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center bg-[#0e1f4d]">
          <img src={logoRfm} alt="RFM" className="w-24 h-24 object-contain animate-pulse" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Demo banner */}
      {!firebaseConfigured && screen.name !== "login" && (
        <div className="bg-amber-400 text-[#0e1f4d] text-[10px] font-extrabold text-center py-1 flex-none">
          MODO DEMO — configura Firebase para guardar datos reales
        </div>
      )}

      {screen.name === "login" && (
        <LoginScreen onLogin={handleLogin} demoMode={!firebaseConfigured} />
      )}

      {screen.name === "home" && effectiveUser && (
        <HomeScreen
          user={effectiveUser} role={role} reports={reports}
          onNewReport={(cat) => setScreen({ name: "nueva", preCategory: cat })}
          onCancelReport={role === "docente" ? handleCancelReportByTeacher : undefined}
          onTab={handleTab} tab={tab}
        />
      )}

      {screen.name === "nueva" && effectiveUser && (
        <NuevaFallaScreen
          user={effectiveUser} role={role}
          preCategory={(screen as { name: "nueva"; preCategory?: Category }).preCategory}
          onBack={() => setScreen((screen as { name: "nueva"; returnTo?: "home" | "admin" }).returnTo === "admin" ? { name: "admin" } : { name: "home" })}
          demoMode={!firebaseConfigured}
          onDemoAdd={(r) => setReports((prev) => [r, ...prev])}
          areas={[...AREAS, ...extraSpaces]}
          nextFolio={nextFolio}
        />
      )}

      {screen.name === "mantenimiento" && (
        <MantenimientoScreen
          reports={reports}
          onDetail={(id) => setScreen({ name: "detalle", reportId: id, returnTo: "mantenimiento" })}
          onTab={handleTab} tab={tab}
        />
      )}

      {screen.name === "admin-fallas" && (
        <MantenimientoScreen reports={reports} onDetail={(id) => setScreen({ name: "detalle", reportId: id, returnTo: "admin-fallas" })} onTab={handleTab} tab={tab} readOnly title="Administracion" admin />
      )}

      {screen.name === "admin-materiales" && (
        <AdminMaterialScreen requests={materialRequests} onRequestStatus={(id, status) => void handleRequestStatus(id, status)} onViewHistory={() => setScreen({ name: "admin-materiales-historial" })} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "admin-apoyos" && (
        <AdminMaterialScreen kind="apoyo_externo" requests={materialRequests} onRequestStatus={(id, status) => void handleRequestStatus(id, status)} onViewHistory={() => setScreen({ name: "admin-materiales-historial" })} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "admin-materiales-historial" && (
        <AdminMaterialHistoryScreen requests={materialRequests} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "detalle" && selectedReport && (
        <DetalleScreen
          report={selectedReport}
          viewerRole={role}
          materialRequests={materialRequests}
          isHistory={screen.returnTo === "historial"}
          onBack={() => setScreen(screen.returnTo === "historial" ? { name: "historial" } : screen.returnTo === "admin-fallas" ? { name: "admin-fallas" } : screen.returnTo === "admin" ? { name: "admin" } : { name: "mantenimiento" })}
          demoMode={!firebaseConfigured}
          onDemoUpdate={(id, data) =>
            setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r))
          }
          onMaterialRequest={(request) => setMaterialRequests((current) => [request, ...current])}
          onRequestStatus={(id, status) => void handleRequestStatus(id, status)}
          requesterName={sessionName}
        />
      )}

      {screen.name === "historial" && (
        <HistorialScreen reports={reports} materialRequests={materialRequests} role={role} onDetail={(id) => setScreen({ name: "detalle", reportId: id, returnTo: "historial" })} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "usuarios" && (
        <UsuariosScreen users={appUsers} onAddTechnician={(email, temporaryPassword, role) => void handleAddTechnician(email, temporaryPassword, role)} onDeleteUser={(id) => void handleDeleteUser(id)} onOpenUsers={(userRole) => setScreen({ name: "usuarios-list", role: userRole })} onViewAllUsers={() => setScreen({ name: "usuarios-list", role: "all" })} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "usuarios-list" && (
        <UsuariosListaScreen role={screen.role} users={appUsers} onDeleteUser={(id) => void handleDeleteUser(id)} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "perfil" && effectiveUser && (
        <PerfilScreen user={effectiveUser} role={role} onLogout={handleLogout} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "admin" && (
        <AdminScreen
          reports={reports}
          requests={materialRequests}
          onTab={handleTab}
          tab={tab}
          onOpenFailures={() => setScreen({ name: "admin-fallas" })}
          onOpenMaterials={() => setScreen({ name: "admin-materiales" })}
          onOpenApoyos={() => setScreen({ name: "admin-apoyos" })}
          onOpenReport={(id) => setScreen({ name: "detalle", reportId: id, returnTo: "admin" })}
          onNewReport={(cat) => setScreen({ name: "nueva", preCategory: cat, returnTo: "admin" })}
          onCancelReport={(id) => void handleCancelReportByTeacher(id)}
          onAddSpace={(name) => void handleAddSpace(name)}
          spaces={extraSpaces}
        />
      )}
    </Shell>
  );
}
