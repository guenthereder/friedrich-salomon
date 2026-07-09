import { getLocale, makeT } from "@/lib/i18n";
import { getActiveOtp, isEnvOtp } from "@/lib/otp";
import { buildTree, type TreeNode } from "@/lib/tree";
import { imageSrcFor } from "@/lib/images";
import { OtpPanel } from "./OtpPanel";
import { TreeView, CreateRoot } from "./TreeView";

async function collectThumbs(nodes: TreeNode[], map: Record<number, string>): Promise<void> {
  await Promise.all(
    nodes.map(async (n) => {
      if (n.type === "image") {
        const src = await imageSrcFor(n.id);
        if (src) map[n.id] = src.thumb;
      }
      if (n.children.length) await collectThumbs(n.children, map);
    }),
  );
}

export default async function AdminDashboard() {
  const locale = await getLocale();
  const t = makeT(locale);
  const tree = buildTree();
  const otp = getActiveOtp();

  const thumbs: Record<number, string> = {};
  await collectThumbs(tree, thumbs);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">{t("admin.tree")}</h2>
          <CreateRoot locale={locale} />
        </header>
        <TreeView tree={tree} locale={locale} emptyLabel={t("viewer.empty")} thumbs={thumbs} />
      </section>
      <aside>
        <OtpPanel
          code={otp?.code ?? null}
          expiresAt={otp?.expires_at ?? null}
          revoked={otp?.revoked === 1}
          isEnvOtp={isEnvOtp()}
          labels={{
            title: t("admin.otp"),
            current: t("admin.otp.current"),
            rotate: t("admin.otp.rotate"),
            revoke: t("admin.otp.revoke"),
            copyLink: t("admin.otp.copyLink"),
            set: t("admin.otp.set"),
            apply: t("admin.otp.apply"),
            envNotice: t("admin.otp.envNotice"),
            none: "—",
          }}
        />
      </aside>
    </div>
  );
}
