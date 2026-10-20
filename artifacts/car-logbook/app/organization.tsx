import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useOrg, type OrgRole } from "@/context/OrgContext";
import { useSubscription } from "@/context/SubscriptionContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { errorMessage } from "@/lib/errors";
import { localizeBrand } from "@/lib/carBrandLogo";
import { localizeDigits } from "@/lib/i18n";

type Member = {
  id: number;
  userId: number | null;
  email: string;
  role: OrgRole;
  status: "invited" | "active" | "rejected" | "removed";
  name: string | null;
};

type ClientLink = {
  id: number;
  orgId: number;
  memberId: number;
  carId: number;
  type: "shop_assigned" | "personal_link";
  status: "pending" | "active" | "rejected" | "revoked" | "suspended";
  requestedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  car?: { id: number; make: string; model: string; year: number; nickname: string | null; vehicleType: string | null };
};

type OrgDetail = {
  organization: { id: number; name: string; organizationType: "fleet" | "repair_shop"; seatLimit: number | null; ownerUserId: number; seatsUsed?: number };
  role: OrgRole;
  members: Member[];
  links?: ClientLink[];
};

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
};

type RepairShopConversionPreview = {
  currentOccupiedSeats: number;
  repairShopOccupiedSeats: number;
  seatLimit: number | null;
  staffMemberships: number;
  clientOverage: number;
  canConvert: boolean;
};

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

  const currentOrgId = activeOrgId ?? orgs[0]?.id ?? null;

  const detailQuery = useQuery<OrgDetail>({
    queryKey: ["org", currentOrgId],
    queryFn: () => apiGet<OrgDetail>(`/orgs/${currentOrgId}`),
    enabled: currentOrgId != null,
  });

  const refreshOrgState = () => {
    qc.invalidateQueries({ queryKey: ["orgs"] });
    qc.invalidateQueries({ queryKey: ["org", currentOrgId] });
    qc.invalidateQueries({ queryKey: ["cars"] });
  };

  const [activeTab, setActiveTab] = useState<"staff" | "clients">("staff");

  // Create org
  const [newName, setNewName] = useState("");
  const [orgType, setOrgType] = useState<"fleet" | "repair_shop" | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: (vars: { name: string; organizationType: string }) => apiPost<{ organization: { id: number } }>("/orgs", vars),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewName("");
      setOrgType(null);
      qc.invalidateQueries({ queryKey: ["orgs"] });
      setActiveOrgId(res.organization.id);
    },
    onError: (e) => setCreateError(errorMessage(e, t("org.createError"))),
  });

  // Invites
  const [actionError, setActionError] = useState<string | null>(null);
  const acceptMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiPost<{ orgId: number; role: OrgRole }>(`/orgs/invites/${memberId}/accept`, {}),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshOrgState();
      setActiveOrgId(res.orgId);
    },
    onError: (e) => setActionError(errorMessage(e, t("org.acceptError"))),
  });

  const rejectMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiPost(`/orgs/invites/${memberId}/reject`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshOrgState();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });

  // Invite member
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("staff");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ email: string; role: OrgRole } | null>(null);
  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: OrgRole }) => apiPost(`/orgs/${currentOrgId}/members`, vars),
    onSuccess: (_res, vars) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastInvite(vars);
      setInviteEmail("");
      setInviteError(null);
      refreshOrgState();
    },
    onError: (e) => setInviteError(errorMessage(e, t("org.inviteError"))),
  });

  const shareInviteOnWhatsApp = async (orgName: string, email: string) => {
    const message = t("org.whatsappMessage", { org: orgName, email });
    try {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    } catch {
      setInviteError(t("org.whatsappError"));
    }
  };

  // Role change / remove
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

  // Rename / delete org
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

  // Client Links
  const linkStatusMutation = useMutation({
    mutationFn: ({ linkId, status }: { linkId: number; status: string }) => apiPatch(`/orgs/${currentOrgId}/client-links/${linkId}`, { status }),
    onSuccess: refreshOrgState,
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });

  const assignCarMutation = useMutation({
    mutationFn: ({ memberId, carId }: { memberId: number; carId: number }) => apiPost(`/orgs/${currentOrgId}/client-links`, { memberId, carId }),
    onSuccess: () => {
      setAssignCarModal(null);
      refreshOrgState();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });

  const linkPersonalCarMutation = useMutation({
    mutationFn: (carId: number) => apiPost(`/orgs/${currentOrgId}/client-links/personal`, { carId }),
    onSuccess: () => {
      setLinkCarModal(false);
      refreshOrgState();
    },
    onError: (e) => setActionError(errorMessage(e, t("org.actionError"))),
  });

  const [confirm, setConfirm] = useState<{ visible: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void }>({ visible: false, title: "", message: "", confirmLabel: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirm((s) => ({ ...s, visible: false }));

  const detail = detailQuery.data;
  const myRole = detail?.role ?? null;
  const isAdmin = myRole === "admin";
  const isStaff = myRole === "staff";
  const isClient = myRole === "client";
  const isOwner = detail?.organization.ownerUserId === user?.id;

  useEffect(() => {
    if (detail?.organization.organizationType === "repair_shop") {
      setActiveTab("clients");
      setInviteRole("client");
    } else if (detail?.organization.organizationType === "fleet") {
      setActiveTab("staff");
      setInviteRole("staff");
    }
  }, [currentOrgId, detail?.organization.organizationType]);

  const [assignCarModal, setAssignCarModal] = useState<number | null>(null); // memberId
  const [linkCarModal, setLinkCarModal] = useState(false);
  const [conversionModal, setConversionModal] = useState(false);

  // Queries for modals
  const orgCarsQuery = useQuery<Car[]>({
    queryKey: ["orgs", currentOrgId, "cars"],
    queryFn: () => apiGet<Car[]>(`/orgs/${currentOrgId}/cars`),
    enabled: !!assignCarModal,
  });

  const personalCarsQuery = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
    enabled: linkCarModal,
  });

  const conversionPreviewQuery = useQuery<RepairShopConversionPreview>({
    queryKey: ["org", currentOrgId, "repair-shop-conversion"],
    queryFn: () => apiGet<RepairShopConversionPreview>(`/orgs/${currentOrgId}/repair-shop-conversion`),
    enabled: conversionModal && currentOrgId != null,
  });
  const conversionMutation = useMutation({
    mutationFn: () => apiPost(`/orgs/${currentOrgId}/repair-shop-conversion`, { confirm: true }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConversionModal(false);
      refreshOrgState();
    },
    onError: (e) => {
      setActionError(errorMessage(e, t("org.conversionError")));
      conversionPreviewQuery.refetch();
    },
  });

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
                {t("org.invitedToJoin", { org: inv.orgName, role: inv.role === "client" ? t("org.roleClient") : inv.role === "admin" ? t("org.roleAdmin") : t("org.roleStaff") })}
              </Text>
            </View>
            <View style={[styles.inviteActions, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable
                onPress={() => rejectMutation.mutate(inv.memberId)}
                disabled={rejectMutation.isPending}
                style={[styles.rejectBtn, { opacity: rejectMutation.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.rejectBtnText}>{t("org.reject")}</Text>
              </Pressable>
              <Pressable
                onPress={() => acceptMutation.mutate(inv.memberId)}
                disabled={acceptMutation.isPending}
                style={[styles.acceptBtn, { opacity: acceptMutation.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.acceptBtnText}>{acceptMutation.isPending ? t("org.accepting") : t("org.accept")}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {actionError && <Text style={styles.errorText}>{actionError}</Text>}
      </View>
    );
  };

  const renderCarPicker = (
    visible: boolean,
    onClose: () => void,
    title: string,
    cars: Car[] | undefined,
    onSelect: (carId: number) => void,
    loading: boolean
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: C.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={24} color={C.text} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={C.tint} style={{ padding: 40 }} />
          ) : !cars || cars.length === 0 ? (
            <Text style={[styles.helperText, { color: C.textSecondary, textAlign: "center", padding: 20 }]}>{t("common.noResults", { query: "" })}</Text>
          ) : (
            <FlatList
              data={cars}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const brand = localizeBrand(item.make, i18n.language);
                const yr = localizeDigits(item.year, i18n.language);
                const label = item.nickname ?? `${yr} ${brand} ${item.model}`;
                return (
                  <Pressable
                    onPress={() => onSelect(item.id)}
                    style={[styles.carPickerRow, { borderBottomColor: C.borderLight }, isRTL && { flexDirection: "row-reverse" }]}
                  >
                    <Ionicons name="car-outline" size={20} color={C.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.carPickerName, { color: C.text }, isRTL && { textAlign: "right" }]}>{label}</Text>
                      {item.licensePlate && <Text style={[styles.carPickerSub, { color: C.textSecondary }, isRTL && { textAlign: "right" }]}>{item.licensePlate}</Text>}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  let body: React.ReactNode;

  if (orgsLoading || (currentOrgId != null && detailQuery.isLoading)) {
    body = <View style={styles.loading}><ActivityIndicator size="large" color={C.tint} /></View>;
  } else if (currentOrgId == null) {
    body = (
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {renderInvites()}
        {isEnterprise ? (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.createTitle")}</Text>
            <Text style={[styles.helperText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.createSub")}</Text>

            <Text style={[styles.fieldLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left", marginTop: 16 }]}>{t("org.createTypeLabel")}</Text>

            <View style={{ gap: 12, marginTop: 8 }}>
              <Pressable testID="org-type-fleet" onPress={() => setOrgType("fleet")} style={[styles.typeCard, orgType === "fleet" && styles.typeCardActive, { borderColor: orgType === "fleet" ? "#4338CA" : C.border, backgroundColor: orgType === "fleet" ? "#EEF2FF" : C.backgroundTertiary }]}>
                 <Text style={[styles.typeTitle, { color: C.text }, isRTL && { textAlign: "right" }]}>{t("org.typeFleetTitle")}</Text>
                 <Text style={[styles.typeSub, { color: C.textSecondary }, isRTL && { textAlign: "right" }]}>{t("org.typeFleetSub")}</Text>
              </Pressable>

              <Pressable testID="org-type-repair-shop" onPress={() => setOrgType("repair_shop")} style={[styles.typeCard, orgType === "repair_shop" && styles.typeCardActive, { borderColor: orgType === "repair_shop" ? "#4338CA" : C.border, backgroundColor: orgType === "repair_shop" ? "#EEF2FF" : C.backgroundTertiary }]}>
                 <Text style={[styles.typeTitle, { color: C.text }, isRTL && { textAlign: "right" }]}>{t("org.typeRepairShopTitle")}</Text>
                 <Text style={[styles.typeSub, { color: C.textSecondary }, isRTL && { textAlign: "right" }]}>{t("org.typeRepairShopSub")}</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <FormField label={t("org.nameLabel")} value={newName} onChangeText={(v) => { setNewName(v); setCreateError(null); }} placeholder={t("org.namePlaceholder")} />
            </View>

            {createError && <Text style={styles.errorText}>{createError}</Text>}
            <PrimaryButton testID="create-org-btn" label={createMutation.isPending ? t("org.creating") : t("org.create")} onPress={() => createMutation.mutate({ name: newName.trim(), organizationType: orgType! })} loading={createMutation.isPending} disabled={!newName.trim() || !orgType} variant="metallic-blue" icon="plus" />
          </View>
        ) : (
          invites.length === 0 && (
            <EmptyState ionIcon="business-outline" title={t("org.needEnterpriseTitle")} description={t("org.needEnterpriseSub")} actionLabel={t("org.upgradeCta")} onAction={() => router.push("/enterprise-upgrade")} />
          )
        )}
      </KeyboardAwareScrollViewCompat>
    );
  } else if (detail) {
    const isClientView = isClient;
    const isRepairShop = detail.organization.organizationType === "repair_shop";
    const members = detail.members.filter(m => (m.status === "active" || m.status === "invited") && (isRepairShop ? m.role === "client" : (activeTab === "staff" ? (m.role === "admin" || m.role === "staff") : m.role === "client")));
    const seatLimit = detail.organization.seatLimit;
    const used = detail.organization.seatsUsed ?? detail.members.filter(m => (m.status === "active" || m.status === "invited") && (isRepairShop ? m.role === "client" : (m.role === "admin" || m.role === "staff"))).length;
    const seatsText = seatLimit == null
      ? (isRepairShop ? t("org.seatsUnlimitedRepairShop", { used }) : t("org.seatsUnlimited", { used }))
      : (isRepairShop ? t("org.seatsUsedRepairShop", { used, total: seatLimit }) : t("org.seatsUsed", { used, total: seatLimit }));

    body = (
      <>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {renderInvites()}

        <View style={[styles.section, { backgroundColor: C.card }]}>
          {orgs.length > 1 && (
            <View style={[styles.orgChips, isRTL && { flexDirection: "row-reverse" }]}>
              {orgs.map((o) => {
                const active = o.id === currentOrgId;
                return (
                  <Pressable key={o.id} onPress={() => setActiveOrgId(o.id)} style={[styles.chip, { backgroundColor: active ? "#4338CA" : C.backgroundTertiary }]}>
                    <Text style={[styles.chipText, { color: active ? "#fff" : C.textSecondary }]} numberOfLines={1}>{o.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {editingName ? (
            <View style={{ gap: 10 }}>
              <FormField label={t("org.renameTitle")} value={nameDraft} onChangeText={setNameDraft} placeholder={t("org.namePlaceholder")} />
              <View style={[styles.rowGap, isRTL && { flexDirection: "row-reverse" }]}>
                <Pressable onPress={() => setEditingName(false)} style={[styles.smallBtn, { backgroundColor: C.backgroundTertiary }]}><Text style={[styles.smallBtnText, { color: C.textSecondary }]}>{t("common.cancel")}</Text></Pressable>
                <Pressable onPress={() => renameMutation.mutate(nameDraft.trim())} disabled={!nameDraft.trim() || renameMutation.isPending} style={[styles.smallBtn, { backgroundColor: "#4338CA", opacity: !nameDraft.trim() || renameMutation.isPending ? 0.5 : 1 }]}><Text style={[styles.smallBtnText, { color: "#fff" }]}>{t("org.save")}</Text></Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.orgNameRow, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <View style={[styles.typeBadge, { backgroundColor: isRepairShop ? "#FEF3C7" : "#E0E7FF", alignSelf: isRTL ? "flex-end" : "flex-start" }]}>
                   <Text style={[styles.typeBadgeText, { color: isRepairShop ? "#92400E" : "#3730A3" }]}>{isRepairShop ? t("org.typeRepairShopDetail") : t("org.typeFleetDetail")}</Text>
                </View>
                <Text style={[styles.orgName, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{detail.organization.name}</Text>
                {!isClientView && <Text style={[styles.memberSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{seatsText}</Text>}
              </View>
              {isAdmin && (
                <Pressable onPress={() => { setNameDraft(detail.organization.name); setEditingName(true); }} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <Feather name="edit-2" size={18} color={C.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {!isClientView && isAdmin && (
          <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/org-activity"); }} style={({ pressed }) => [styles.activityBtn, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.85 : 1 }, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.activityIcon, { backgroundColor: "#EEF2FF" }]}><Feather name="activity" size={18} color="#4338CA" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("orgActivity.openButton")}</Text>
              <Text style={[styles.activitySub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{t("orgActivity.subtitle")}</Text>
            </View>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={C.textSecondary} />
          </Pressable>
        )}

        {isOwner && !isRepairShop && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.convertTitle")}</Text>
            <Text style={[styles.helperText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.convertSub")}</Text>
            <PrimaryButton testID="preview-repair-shop-conversion" label={t("org.previewConversion")} onPress={() => setConversionModal(true)} variant="ghost" icon="repeat" />
          </View>
        )}

        {!isClientView && isAdmin && !isRepairShop && (
          <View style={[styles.segment, { backgroundColor: C.backgroundTertiary, marginTop: 4 }, isRTL && { flexDirection: "row-reverse" }]}>
            {(["staff", "clients"] as const).map((r) => {
              const active = activeTab === r;
              return (
                <Pressable key={r} onPress={() => { Haptics.selectionAsync(); setActiveTab(r); }} style={[styles.segmentBtn, active && { backgroundColor: C.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}>
                  <Text style={[styles.segmentText, { color: active ? C.text : C.textSecondary }]}>{t(`org.tab${r.charAt(0).toUpperCase() + r.slice(1)}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isClientView && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.clientLinksTitle", { name: detail.organization.name })}</Text>
            {detail.links?.filter(l => l.memberId === detail.members.find(m => m.userId === user?.id)?.id).map(link => (
              <View key={link.id} style={[styles.memberRow, { borderColor: C.borderLight }, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: C.text }, isRTL && { textAlign: "right" }]}>{link.car?.nickname ?? `${link.car?.year} ${localizeBrand(link.car?.make || "", i18n.language)} ${link.car?.model}`}</Text>
                  <View style={[styles.badgeRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.badge, { backgroundColor: link.type === "shop_assigned" ? "#E0E7FF" : "#FEF3C7" }]}>
                      <Text style={[styles.badgeText, { color: link.type === "shop_assigned" ? "#3730A3" : "#92400E" }]}>{link.type === "shop_assigned" ? t("org.shopAssigned") : t("org.personalLink")}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: link.status === "active" ? "#DCFCE7" : link.status === "pending" ? "#FEF9C3" : "#FEE2E2" }]}>
                      <Text style={[styles.badgeText, { color: link.status === "active" ? "#166534" : link.status === "pending" ? "#854D0E" : "#991B1B" }]}>{t(`org.status${link.status.charAt(0).toUpperCase() + link.status.slice(1)}`)}</Text>
                    </View>
                  </View>
                </View>
                {link.status === "pending" && link.type === "shop_assigned" && (
                   <View style={[styles.inviteActions, isRTL && { flexDirection: "row-reverse" }]}>
                      <Pressable testID={`reject-link-btn-${link.id}`} onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "rejected" })} style={[styles.rejectBtn]}>
                        <Text style={styles.rejectBtnText}>{t("org.reject")}</Text>
                      </Pressable>
                      <Pressable testID={`accept-link-btn-${link.id}`} onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "active" })} style={[styles.acceptBtn]}>
                        <Text style={styles.acceptBtnText}>{t("org.accept")}</Text>
                      </Pressable>
                   </View>
                )}
                {link.status === "active" && (
                  <Pressable testID={`revoke-link-btn-${link.id}`} onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "revoked" })} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
                    <Feather name="trash-2" size={16} color={C.danger} />
                  </Pressable>
                )}
                {link.status !== "active" && link.type === "personal_link" && link.status !== "revoked" && (
                  <Pressable testID={`restore-link-btn-${link.id}`} onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "active" })} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
                    <Feather name="refresh-ccw" size={16} color={C.success} />
                  </Pressable>
                )}
              </View>
            ))}
            <PrimaryButton testID="link-personal-car-btn" label={t("org.linkPersonalCar")} onPress={() => setLinkCarModal(true)} variant="ghost" icon="link" />
          </View>
        )}

        {!isClientView && isAdmin && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{isRepairShop ? t("org.inviteClient") : (activeTab === "staff" ? t("org.invite") : t("org.inviteClient"))}</Text>
            <FormField label={t("org.inviteEmailLabel")} value={inviteEmail} onChangeText={(v) => { setInviteEmail(v); setInviteError(null); setLastInvite(null); }} placeholder={t("org.inviteEmailPlaceholder")} keyboardType="email-address" autoCapitalize="none" />
            {!isRepairShop && activeTab === "staff" && (
              <>
                <Text style={[styles.fieldLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.inviteRole")}</Text>
                <View style={[styles.segment, { backgroundColor: C.backgroundTertiary }, isRTL && { flexDirection: "row-reverse" }]}>
                  {(["staff", "admin"] as OrgRole[]).map((r) => {
                    const active = inviteRole === r;
                    return (
                      <Pressable key={r} onPress={() => setInviteRole(r)} style={[styles.segmentBtn, active && { backgroundColor: "#4338CA" }]}>
                        <Text style={[styles.segmentText, { color: active ? "#fff" : C.textSecondary }]}>{r === "admin" ? t("org.roleAdmin") : t("org.roleStaff")}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            {inviteError && <Text style={styles.errorText}>{inviteError}</Text>}
            <PrimaryButton label={inviteMutation.isPending ? t("org.sending") : t("org.sendInvite")} onPress={() => inviteMutation.mutate({ email: inviteEmail.trim(), role: (isRepairShop || activeTab === "clients") ? "client" : inviteRole })} loading={inviteMutation.isPending} disabled={!inviteEmail.trim()} variant="metallic-blue" icon="user-plus" />
            {lastInvite && (
              <View style={styles.inviteSentBox}>
                <Text style={[styles.helperText, { color: "#16A34A", textAlign: isRTL ? "right" : "left" }]}>{t("org.inviteSentTo", { email: lastInvite.email })}</Text>
                <Pressable onPress={() => shareInviteOnWhatsApp(detail.organization.name, lastInvite.email)} style={({ pressed }) => [styles.whatsappBtn, { opacity: pressed ? 0.85 : 1 }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={styles.whatsappBtnText}>{t("org.shareWhatsapp")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!isClientView && isAdmin && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{isRepairShop ? t("org.repairShopClientsSection") : (activeTab === "staff" ? t("org.membersSection") : t("org.clientsSection"))}</Text>
            {members.length === 0 ? (
              <Text style={[styles.helperText, { color: C.textSecondary }]}>{t("org.noMembersYet")}</Text>
            ) : (
              members.map((m) => {
                const memberIsOwner = m.userId === detail.organization.ownerUserId;
                const isSelf = m.userId === user?.id;
                const canManage = isAdmin && !memberIsOwner && !isSelf;
                const memberLinks = detail.links?.filter(l => l.memberId === m.id) || [];
                return (
                  <View key={m.id} style={[styles.memberRowBase, { borderColor: C.borderLight }]}>
                    <View style={[styles.memberRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: C.text }, isRTL && { textAlign: "right" }]}>{m.name ?? m.email}</Text>
                        <Text style={[styles.memberSub, { color: C.textSecondary }, isRTL && { textAlign: "right" }]}>{m.email}</Text>
                        <View style={[styles.badgeRow, isRTL && { flexDirection: "row-reverse" }]}>
                          <View style={[styles.badge, { backgroundColor: m.role === "admin" ? "#E0E7FF" : m.role === "client" ? "#ECFDF5" : C.backgroundTertiary }]}>
                            <Text style={[styles.badgeText, { color: m.role === "admin" ? "#3730A3" : m.role === "client" ? "#065F46" : C.textSecondary }]}>{m.role === "admin" ? t("org.roleAdmin") : m.role === "client" ? t("org.roleClient") : t("org.roleStaff")}</Text>
                          </View>
                          {memberIsOwner && <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}><Text style={[styles.badgeText, { color: "#92400E" }]}>{t("org.ownerBadge")}</Text></View>}
                          {m.status === "invited" && <View style={[styles.badge, { backgroundColor: C.backgroundTertiary }]}><Text style={[styles.badgeText, { color: C.textSecondary }]}>{t("org.statusInvited")}</Text></View>}
                          {isSelf && <View style={[styles.badge, { backgroundColor: C.tint + "1A" }]}><Text style={[styles.badgeText, { color: C.tint }]}>{t("org.youBadge")}</Text></View>}
                        </View>
                      </View>
                      {canManage && (
                        <View style={[styles.memberActions, isRTL && { flexDirection: "row-reverse" }]}>
                          {m.role !== "client" && (
                            <Pressable onPress={() => roleMutation.mutate({ memberId: m.id, role: m.role === "admin" ? "staff" : "admin" })} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
                              <Feather name={m.role === "admin" ? "arrow-down" : "arrow-up"} size={16} color={C.textSecondary} />
                            </Pressable>
                          )}
                          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setConfirm({ visible: true, title: t("org.removeConfirmTitle"), message: t("org.removeConfirmMessage", { name: m.name ?? m.email }), confirmLabel: t("org.remove"), onConfirm: () => { closeConfirm(); removeMutation.mutate(m.id); } }); }} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
                            <Feather name="trash-2" size={16} color={C.danger} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                    {activeTab === "clients" && (
                      <View style={styles.clientLinksBox}>
                        {memberLinks.map(link => (
                          <View key={link.id} style={[styles.clientLinkRow, isRTL && { flexDirection: "row-reverse" }]}>
                            <Ionicons name="car-outline" size={16} color={C.textSecondary} />
                            <Text style={[styles.clientLinkText, { color: C.textSecondary }, isRTL && { textAlign: "right", maxWidth: 120 }]} numberOfLines={1}>{link.car?.nickname ?? `${link.car?.year} ${localizeBrand(link.car?.make || "", i18n.language)} ${link.car?.model}`}</Text>
                            <View style={[styles.badge, { backgroundColor: link.status === "active" ? "#DCFCE7" : link.status === "pending" ? "#FEF9C3" : "#FEE2E2", paddingHorizontal: 4, paddingVertical: 2, marginLeft: 4 }]}>
                              <Text style={[styles.badgeText, { color: link.status === "active" ? "#166534" : link.status === "pending" ? "#854D0E" : "#991B1B", fontSize: 9 }]}>{t(`org.status${link.status.charAt(0).toUpperCase() + link.status.slice(1)}`)}</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                              {link.status === "suspended" && link.type === "shop_assigned" && (
                                <Pressable onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "active" })} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                                  <Text style={{ color: C.success, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{t("org.restore")}</Text>
                                </Pressable>
                              )}
                              {link.status === "active" && (
                                <Pressable onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "suspended" })} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                                  <Text style={{ color: C.warning, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{t("org.suspend")}</Text>
                                </Pressable>
                              )}
                              {link.status !== "revoked" && (
                                <Pressable onPress={() => linkStatusMutation.mutate({ linkId: link.id, status: "revoked" })} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                                  <Text style={{ color: C.danger, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{t("org.revoke")}</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        ))}
                        <Pressable testID={`assign-car-btn-${m.id}`} onPress={() => setAssignCarModal(m.id)} style={[styles.assignCarBtn, isRTL && { flexDirection: "row-reverse" }]}>
                          <Feather name="plus" size={14} color="#4338CA" />
                          <Text style={styles.assignCarBtnText}>{t("org.assignCar")}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            {actionError && <Text style={styles.errorText}>{actionError}</Text>}
          </View>
        )}

        {isOwner && !isClientView && (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setConfirm({ visible: true, title: t("org.deleteConfirmTitle"), message: t("org.deleteConfirmMessage"), confirmLabel: t("org.delete"), onConfirm: () => { closeConfirm(); deleteMutation.mutate(); } }); }} style={({ pressed }) => [styles.deleteOrgBtn, { backgroundColor: C.dangerLight, opacity: pressed ? 0.8 : 1 }]}>
            <Feather name="trash-2" size={16} color={C.danger} />
            <Text style={[styles.deleteOrgText, { color: C.danger }]}>{t("org.deleteOrg")}</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>

      {renderCarPicker(
        !!assignCarModal,
        () => setAssignCarModal(null),
        t("org.selectCar"),
        orgCarsQuery.data,
        (carId) => assignCarMutation.mutate({ memberId: assignCarModal!, carId }),
        orgCarsQuery.isLoading
      )}

      {renderCarPicker(
        linkCarModal,
        () => setLinkCarModal(false),
        t("org.linkPersonalCar"),
        personalCarsQuery.data,
        (carId) => linkPersonalCarMutation.mutate(carId),
        personalCarsQuery.isLoading
      )}
      <Modal visible={conversionModal} transparent animationType="fade" onRequestClose={() => setConversionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.conversionCard, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("org.conversionPreviewTitle")}</Text>
            {conversionPreviewQuery.isLoading ? (
              <ActivityIndicator color={C.tint} style={{ padding: 24 }} />
            ) : conversionPreviewQuery.isError || !conversionPreviewQuery.data ? (
              <Text style={[styles.errorText, isRTL && { textAlign: "right" }]}>{t("org.conversionPreviewError")}</Text>
            ) : (
              <>
                <Text style={[styles.helperText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {t("org.conversionSeatChange", {
                    before: conversionPreviewQuery.data.currentOccupiedSeats,
                    after: conversionPreviewQuery.data.repairShopOccupiedSeats,
                  })}
                </Text>
                <Text style={[styles.helperText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("org.conversionRoleImpact")}</Text>
                {conversionPreviewQuery.data.staffMemberships > 0 && (
                  <Text style={[styles.blockerText, isRTL && { textAlign: "right" }]}>
                    {t("org.conversionStaffBlocker", { count: conversionPreviewQuery.data.staffMemberships })}
                  </Text>
                )}
                {conversionPreviewQuery.data.clientOverage > 0 && (
                  <Text style={[styles.blockerText, isRTL && { textAlign: "right" }]}>
                    {t("org.conversionOverageBlocker", { count: conversionPreviewQuery.data.clientOverage })}
                  </Text>
                )}
                {conversionPreviewQuery.data.canConvert && (
                  <Text style={[styles.warningText, isRTL && { textAlign: "right" }]}>{t("org.conversionIrreversible")}</Text>
                )}
              </>
            )}
            <View style={[styles.rowGap, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable onPress={() => setConversionModal(false)} style={[styles.smallBtn, { backgroundColor: C.backgroundTertiary }]}>
                <Text style={[styles.smallBtnText, { color: C.textSecondary }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                testID="confirm-repair-shop-conversion"
                onPress={() => conversionMutation.mutate()}
                disabled={!conversionPreviewQuery.data?.canConvert || conversionMutation.isPending}
                style={[styles.smallBtn, { backgroundColor: "#DC2626", opacity: !conversionPreviewQuery.data?.canConvert || conversionMutation.isPending ? 0.45 : 1 }]}
              >
                <Text style={[styles.smallBtnText, { color: "#fff" }]}>{conversionMutation.isPending ? t("org.converting") : t("org.confirmConversion")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </>
    );
  } else {
    body = <EmptyState ionIcon="business-outline" title={t("org.emptyTitle")} description={t("org.emptySub")} />;
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      {renderHeader()}
      {body}
      <ConfirmModal visible={confirm.visible} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} confirmStyle="destructive" onConfirm={confirm.onConfirm} onCancel={closeConfirm} />
      <BottomNav />
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#818CF8" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  form: { padding: 20, gap: 16 },
  section: { padding: 16, borderRadius: 16, gap: 12 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  helperText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  activityBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  activitySub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  typeCard: { borderWidth: 1.5, borderRadius: 12, padding: 16 },
  typeCardActive: { },
  typeTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  typeSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
  memberRowBase: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inviteActions: { flexDirection: "row", gap: 8 },
  acceptBtn: { backgroundColor: "#4338CA", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  acceptBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  rejectBtn: { backgroundColor: "rgba(220, 38, 38, 0.1)", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  rejectBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#DC2626" },
  inviteSentBox: { gap: 8, marginTop: 10 },
  whatsappBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#25D366", paddingVertical: 12, borderRadius: 12 },
  whatsappBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  deleteOrgBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  deleteOrgText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626" },
  clientLinksBox: { marginTop: 12, paddingLeft: 8, gap: 8 },
  clientLinkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  clientLinkText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  assignCarBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  assignCarBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#4338CA" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 300, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  conversionCard: { width: "100%", maxWidth: 420, borderRadius: 20, padding: 22, gap: 14 },
  blockerText: { color: "#DC2626", fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold" },
  warningText: { color: "#B45309", fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold" },
  carPickerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  carPickerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  carPickerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }
});
