import { Sparkles } from "lucide-react";
import { POST_TYPES, type PostTypeId } from "../../shared/postTypes";
import { AppHeader } from "./AppHeader";

interface HomePageProps {
  onSelect: (postType: PostTypeId) => void;
  onLogout: () => void | Promise<void>;
  logoutBusy?: boolean;
}

export function HomePage({ onSelect, onLogout, logoutBusy = false }: HomePageProps) {
  return (
    <main className="home-page flex h-screen flex-col overflow-hidden bg-base-200 text-base-content">
      <AppHeader onLogout={onLogout} logoutBusy={logoutBusy} />

      <div className="app-scroll relative min-h-0 flex-1">
        <div className="home-page-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
          <div className="home-page-hero mb-10 text-center lg:mb-12">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-base-300/70 bg-base-100/80 px-3 py-1 text-xs font-semibold text-base-content/65 shadow-sm">
              <Sparkles size={14} className="text-primary" />
              Alege tipul de postare
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-base-content sm:text-5xl">
              Ce vrei să publici azi?
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
            {POST_TYPES.map((postType, index) => {
              const Icon = postType.icon;
              return (
                <button
                  key={postType.id}
                  type="button"
                  onClick={() => onSelect(postType.id)}
                  aria-label={postType.label}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`home-post-type-card group ${postType.accentClass} flex flex-col rounded-3xl border p-6 text-left sm:p-7`}
                >
                  <div className="mb-6">
                    <span className="home-card-icon flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm">
                      <Icon size={26} strokeWidth={2} />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-base-content sm:text-2xl">
                      {postType.label}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-base-content/65 sm:text-[15px]">
                      {postType.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="home-page-footer mt-10 text-center text-xs text-base-content/45">
            Draft-urile se salvează automat local · Export și publicare Facebook din editor
          </p>
        </div>
      </div>
    </main>
  );
}
