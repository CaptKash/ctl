import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useOrg, type OrgRole } from "@/context/OrgContext";
import { useSubscription } from "@/lib/revenuecat";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";

type Member = {
  id: number;
  userId: number | null;
  email: string;
  role: OrgRole;
  status: "invited" | "active";
  name: string | null;
};

type OrgDetail = {
  organization: { id: number; name: string; seatLimit: number | null; ownerUserId: number };
  role: OrgRole;
  members: Member[];
};

function errorMessage(e: any, fallback: string): string {
  return e?.body?.error ?? e?.message ?? fallback;
}

export default function OrganizationScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isEnterprise } = useSubscription();
  const { orgs, invites, activeOrgId, setActiveOrgId, isLoading: orgsLoading } = useOrg();

  // Which org to manage: the active one, otherwise the first the user belongs to.
  const currentOrgId = activeOrgId ?? orgs[0]?.id ?? null;

  const detailQuery = useQuery<OrgDetail>({
    queryKey: ["org", currentOrgId],
    queryFn: () => apiGet<OrgDetail>(`/orgs/${currentOrgId}`),
    enabled: currentOrgId != null,
  });

  const refreshOrgState = () => {
    qc.invalidateQueries({ queryKey: ["orgs"] });
    qc.invalidateQueries({ queryKey: ["org", currentOrgId] });
  };

  // ── Create org ──────────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: (name: string) => apiPost<{ organization: { id: number } }>("/orgs", { name }),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["orgs"] });
      setActiveOrgId(res.organization.id);
    },
    onError: (e) => setCreateError(errorMessage(e, t("org.createError"))),
  });

  // ── Accept invite ───────────────────────────────────────────────────────
  const [actionError, setActionError] = useState<string | null>(null);
  const acceptMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiPost<{ orgId: number; role: OrgRole }>(`/orgs/invites/${memberId}/accept`, {}),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["orgs"] });
      setActiveOrgId(res.orgId);
    },
    onError: (e) => setActionError(errorMessage(e, t("org.acceptError"))),
  });

  // ── Invite member ───────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("staff");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const inviteMutation = useMutation({
    mutationFn: () => apiPost(`/orgs/${currentOrgId}/members`, { email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteEmail("");
      setInviteRole("staff");
      setInviteError(null);
      refreshOrgState();
    },
    onError: (e) => setInviteError(errorMessage(e, t("org.inviteError"))),
  });

  // ── Role change / remove ────────────────────────────────────────────────
  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: OrgRole }) =>
      apiPatch(`/orgs/${currentOrgId}/members/${memberId}`, { role }),
    onSuccess: refreshOrgState,
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });
  const removeMutation = useMutation({
    mutationFn: (memberId: number) => apiDelete(`/orgs/${currentOrgId}/members/${memberId}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshOrgState();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });

  // ── Rename / delete org ─────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const renameMutation = useMutation({
    mutationFn: (name: string) => apiPatch(`/orgs/${currentOrgId}`, { name }),
    onSuccess: () => {
      setEditingName(false);
      refreshOrgState();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.renameError"))),
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/orgs/${currentOrgId}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveOrgId(null);
      qc.invalidateQueries({ queryKey: ["orgs"] });
      router.back();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.deleteError"))),
  });

  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", confirmLabel: "", onConfirm: () => {} });

  const closeConfirm = () => setConfirm((s) => ({ ...s, visible: false }));

  const detail = detailQuery.data;
  const myRole = detail?.role ?? null;
  const isAdmin = myRole === "admin";
  const isOwner = detail?.organization.ownerUserId === user?.id;

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
        </Pressable>
        <LinearGradient
          colors={["#EEF2FF", "#C7D2FE", "#818CF8"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.iconBox}
        >
          <Ionicons name="business" size={24} color="#312E81" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("org.enterpriseLabel")}</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.subtitle")}</Text>
        </View>
      </View>
    </View>
  );

  // Pending invites block, shown above everything.
  const renderInvites = () => {
    if (invites.length === 0) return null;
    return (
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.pendingInvitesSection")}</Text>
        {invites.map((inv) => (
          <View key={inv.memberId} style={[styles.inviteRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{inv.orgName}</Text>
              <Text style={[styles.memberSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
                {t("org.invitedToJoin", { org: inv.orgName, role: inv.role === "admin" ? t("org.roleAdmin") : t("org.roleStaff") })}
              </Text>
            </View>
            <Pressable
              onPress={() => acceptMutation.mutate(inv.memberId)}
              disabled={acceptMutation.isPending}
              style={[styles.acceptBtn, { opacity: acceptMutation.isPending ? 0.6 : 1 }]}
            >
              <Text style={styles.acceptBtnText}>{acceptMutation.isPending ? t("org.accepting") : t("org.accept")}</Text>
            </Pressable>
          </View>
        ))}
        {actionError && <Text style={styles.errorText}>{actionError}</Text>}
      </View>
    );
  };

  let body: React.ReactNode;

  if (orgsLoading || (currentOrgId != null && detailQuery.isLoading)) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  } else if (currentOrgId == null) {
    // No org membership — either create (enterprise) or upsell.
    body = (
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {renderInvites()}
        {isEnterprise ? (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.createTitle")}</Text>
            <Text style={[styles.helperText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.createSub")}</Text>
            <FormField
              label={t("org.nameLabel")}
              value={newName}
              onChangeText={(v) => { setNewName(v); setCreateError(null); }}
              placeholder={t("org.namePlaceholder")}
            />
            {createError && <Text style={styles.errorText}>{createError}</Text>}
            <PrimaryButton
              label={createMutation.isPending ? t("org.creating") : t("org.create")}
              onPress={() => createMutation.mutate(newName.trim())}
              loading={createMutation.isPending}
              disabled={!newName.trim()}
              variant="metallic-blue"
              icon="plus"
            />
          </View>
        ) : (
          invites.length === 0 && (
            <EmptyState
              ionIcon="business-outline"
              title={t("org.needEnterpriseTitle")}
              description={t("org.needEnterpriseSub")}
              actionLabel={t("org.upgradeCta")}
              onAction={() => router.push("/enterprise-upgrade" as any)}
            />
          )
        )}
      </KeyboardAwareScrollViewCompat>
    );
  } else if (detail) {
    const members = detail.members;
    const seatLimit = detail.organization.seatLimit;
    const used = members.length;
    const seatsText = seatLimit == null
      ? t("org.seatsUnlimited", { used })
      : t("org.seatsUsed", { used, total: seatLimit });

    body = (
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {renderInvites()}

        {/* Org name + multi-org switch */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          {orgs.length > 1 && (
            <View style={[styles.orgChips, isRTL && { flexDirection: "row-reverse" }]}>
              {orgs.map((o) => {
                const active = o.id === currentOrgId;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setActiveOrgId(o.id)}
                    style={[styles.chip, { backgroundColor: active ? "#4338CA" : C.backgroundTertiary }]}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : C.textSecondary }]} numberOfLines={1}>{o.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {editingName ? (
            <View style={{ gap: 10 }}>
              <FormField
                label={t("org.renameTitle")}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder={t("org.namePlaceholder")}
              />
              <View style={[styles.rowGap, isRTL && { flexDirection: "row-reverse" }]}>
                <Pressable onPress={() => setEditingName(false)} style={[styles.smallBtn, { backgroundColor: C.backgroundTertiary }]}>
                  <Text style={[styles.smallBtnText, { color: C.textSecondary }]}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => renameMutation.mutate(nameDraft.trim())}
                  disabled={!nameDraft.trim() || renameMutation.isPending}
                  style={[styles.smallBtn, { backgroundColor: "#4338CA", opacity: !nameDraft.trim() || renameMutation.isPending ? 0.5 : 1 }]}
                >
                  <Text style={[styles.smallBtnText, { color: "#fff" }]}>{t("org.save")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.orgNameRow, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgName, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{detail.organization.name}</Text>
                <Text style={[styles.memberSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{seatsText}</Text>
              </View>
              {isAdmin && (
                <Pressable
                  onPress={() => { setNameDraft(detail.organization.name); setEditingName(true); }}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="edit-2" size={18} color={C.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Oversight: activity log (admin only) */}
        {isAdmin && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push("/org-activity" as any); }}
            style={({ pressed }) => [styles.activityBtn, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.85 : 1 }, isRTL && { flexDirection: "row-reverse" }]}
          >
            <View style={[styles.activityIcon, { backgroundColor: "#EEF2FF" }]}>
              <Feather name="activity" size={18} color="#4338CA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("orgActivity.openButton")}</Text>
              <Text style={[styles.activitySub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{t("orgActivity.subtitle")}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={C.textSecondary} />
          </Pressable>
        )}

        {/* Invite member (admin only) */}
        {isAdmin && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.invite")}</Text>
            <FormField
              label={t("org.inviteEmailLabel")}
              value={inviteEmail}
              onChangeText={(v) => { setInviteEmail(v); setInviteError(null); }}
              placeholder={t("org.inviteEmailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={[styles.fieldLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.inviteRole")}</Text>
            <View style={[styles.segment, { backgroundColor: C.backgroundTertiary }, isRTL && { flexDirection: "row-reverse" }]}>
              {(["staff", "admin"] as OrgRole[]).map((r) => {
                const active = inviteRole === r;
                return (
                  <Pressable key={r} onPress={() => setInviteRole(r)} style={[styles.segmentBtn, active && { backgroundColor: "#4338CA" }]}>
                    <Text style={[styles.segmentText, { color: active ? "#fff" : C.textSecondary }]}>
                      {r === "admin" ? t("org.roleAdmin") : t("org.roleStaff")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {inviteError && <Text style={styles.errorText}>{inviteError}</Text>}
            <PrimaryButton
              label={inviteMutation.isPending ? t("org.sending") : t("org.sendInvite")}
              onPress={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
              disabled={!inviteEmail.trim()}
              variant="metallic-blue"
              icon="user-plus"
            />
          </View>
        )}

        {/* Members list */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.membersSection")}</Text>
          {members.length === 0 ? (
            <Text style={[styles.helperText, { color: C.textSecondary }]}>{t("org.noMembersYet")}</Text>
          ) : (
            members.map((m) => {
              const memberIsOwner = m.userId === detail.organization.ownerUserId;
              const isSelf = m.userId === user?.id;
              const canManage = isAdmin && !memberIsOwner && !isSelf;
              return (
                <View key={m.id} style={[styles.memberRow, { borderColor: C.borderLight }, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
                      {m.name ?? m.email}
                    </Text>
                    <Text style={[styles.memberSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
                      {m.email}
                    </Text>
                    <View style={[styles.badgeRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <View style={[styles.badge, { backgroundColor: m.role === "admin" ? "#E0E7FF" : C.backgroundTertiary }]}>
                        <Text style={[styles.badgeText, { color: m.role === "admin" ? "#3730A3" : C.textSecondary }]}>
                          {m.role === "admin" ? t("org.roleAdmin") : t("org.roleStaff")}
                        </Text>
                      </View>
                      {memberIsOwner && (
                        <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
                          <Text style={[styles.badgeText, { color: "#92400E" }]}>{t("org.ownerBadge")}</Text>
                        </View>
                      )}
                      {m.status === "invited" && (
                        <View style={[styles.badge, { backgroundColor: C.backgroundTertiary }]}>
                          <Text style={[styles.badgeText, { color: C.textSecondary }]}>{t("org.statusInvited")}</Text>
                        </View>
                      )}
                      {isSelf && (
                        <View style={[styles.badge, { backgroundColor: C.tint + "1A" }]}>
                          <Text style={[styles.badgeText, { color: C.tint }]}>{t("org.youBadge")}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {canManage && (
                    <View style={[styles.memberActions, isRTL && { flexDirection: "row-reverse" }]}>
                      <Pressable
                        onPress={() => roleMutation.mutate({ memberId: m.id, role: m.role === "admin" ? "staff" : "admin" })}
                        hitSlop={6}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Feather name={m.role === "admin" ? "arrow-down" : "arrow-up"} size={16} color={C.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setConfirm({
                            visible: true,
                            title: t("org.removeConfirmTitle"),
                            message: t("org.removeConfirmMessage", { name: m.name ?? m.email }),
                            confirmLabel: t("org.remove"),
                            onConfirm: () => { closeConfirm(); removeMutation.mutate(m.id); },
                          });
                        }}
                        hitSlop={6}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Feather name="trash-2" size={16} color={C.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
          {actionError && <Text style={styles.errorText}>{actionError}</Text>}
        </View>

        {/* Delete org (owner only) */}
        {isOwner && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setConfirm({
                visible: true,
                title: t("org.deleteConfirmTitle"),
                message: t("org.deleteConfirmMessage"),
                confirmLabel: t("org.delete"),
                onConfirm: () => { closeConfirm(); deleteMutation.mutate(); },
              });
            }}
            style={({ pressed }) => [styles.deleteOrgBtn, { backgroundColor: C.dangerLight, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="trash-2" size={16} color={C.danger} />
            <Text style={[styles.deleteOrgText, { color: C.danger }]}>{t("org.deleteOrg")}</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>
    );
  } else {
    body = (
      <EmptyState
        ionIcon="business-outline"
        title={t("org.emptyTitle")}
        description={t("org.emptySub")}
      />
    );
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      {renderHeader()}
      {body}
      <ConfirmModal
        visible={confirm.visible}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmStyle="destructive"
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
      <BottomNav />
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#818CF8" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  form: { padding: 20, gap: 16 },
  section: { padding: 16, borderRadius: 16, gap: 12 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  helperText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },

  activityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  activitySub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  orgChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, maxWidth: 180 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  orgNameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orgName: { fontSize: 18, fontFamily: "Inter_700Bold" },

  segment: { flexDirection: "row", borderRadius: 10, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  segmentText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  rowGap: { flexDirection: "row", gap: 10 },
  smallBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  smallBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  inviteRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  acceptBtn: { backgroundColor: "#4338CA", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  acceptBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },

  deleteOrgBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteOrgText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626" },
});
