import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecordCard } from "@/components/ui/RecordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  licenseValidUntil?: string | null;
  vin?: string | null;
  insuredWith?: string | null;
  insuredUntil?: string | null;
  mileage?: number | null;
  notes?: string | null;
};

type MaintenanceRecord = {
  id: number;
  carId: number;
  type: string;
  description: string;
  date: string;
  mileage?: number | null;
  cost?: number | null;
  shop?: string | null;
  nextDueDate?: string | null;
};

type PartsRecord = {
  id: number;
  carId: number;
  name: string;
  brand?: string | null;
  category: string;
  cost?: number | null;
  installedDate?: string | null;
  supplier?: string | null;
};

type InsuranceRecord = {
  id: number;
  carId: number;
  provider: string;
  policyNumber: string;
  type: string;
  premium?: number | null;
  startDate: string;
  endDate?: string | null;
};

type DealershipRecord = {
  id: number;
  carId: number;
  name: string;
  visitDate: string;
  purpose: string;
  cost?: number | null;
  rating?: number | null;
};

type FuelRecord = {
  id: number;
  carId: number;
  date: string;
  mileage: number;
  liters: number;
  totalCost: number;
  fuelType?: string | null;
  station?: string | null;
};

type EventItem = {
  id: number;
  type: "maintenance" | "parts" | "insurance" | "dealership" | "fuel" | "malfunction";
  date: string;
  title: string;
  subtitle: string;
};

const EVENT_TYPE_CONFIG: Record<EventItem["type"], { label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  malfunction: { label: "Malfunction", icon: "alert-triangle", color: "#DC2626", bg: "#FEE2E2" },
  maintenance: { label: "Maintenance", icon: "tool", color: "#D97706", bg: "#FEF3C7" },
  parts: { label: "Parts", icon: "box", color: "#059669", bg: "#D1FAE5" },
  insurance: { label: "Insurance", icon: "shield", color: "#2563EB", bg: "#DBEAFE" },
  dealership: { label: "Dealership", icon: "map-pin", color: "#8B5CF6", bg: "#EDE9FE" },
  fuel: { label: "Fuel", icon: "droplet", color: "#EA580C", bg: "#FED7AA" },
};

const TABS = ["Events", "Maintenance", "Parts", "Insurance", "Dealerships", "Fuel"] as const;
type Tab = typeof TABS[number];

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("Events");

  // Sheets
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddParts, setShowAddParts] = useState(false);
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [showAddDealership, setShowAddDealership] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);

  // Maintenance form
  const [mType, setMType] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mMileage, setMMileage] = useState("");
  const [mCost, setMCost] = useState("");
  const [mShop, setMShop] = useState("");
  const [mNextDate, setMNextDate] = useState("");

  // Parts form
  const [pName, setPName] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pCategory, setPCategory] = useState("");
  const [pCost, setPCost] = useState("");
  const [pSupplier, setPSupplier] = useState("");
  const [pDate, setPDate] = useState(new Date().toISOString().split("T")[0]);

  // Insurance form
  const [iProvider, setIProvider] = useState("");
  const [iPolicy, setIPolicy] = useState("");
  const [iType, setIType] = useState("Comprehensive");
  const [iPremium, setIPremium] = useState("");
  const [iStart, setIStart] = useState(new Date().toISOString().split("T")[0]);
  const [iEnd, setIEnd] = useState("");

  // Dealership form
  const [dName, setDName] = useState("");
  const [dDate, setDDate] = useState(new Date().toISOString().split("T")[0]);
  const [dPurpose, setDPurpose] = useState("");
  const [dCost, setDCost] = useState("");
  const [dPhone, setDPhone] = useState("");

  // Fuel form
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fMileage, setFMileage] = useState("");
  const [fLiters, setFLiters] = useState("");
  const [fCost, setFCost] = useState("");
  const [fType, setFType] = useState("Regular");
  const [fStation, setFStation] = useState("");

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const maintenanceQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance", carId],
    queryFn: () => apiGet<MaintenanceRecord[]>(`/cars/${carId}/maintenance`),
    enabled: activeTab === "Maintenance",
  });

  const partsQuery = useQuery<PartsRecord[]>({
    queryKey: ["parts", carId],
    queryFn: () => apiGet<PartsRecord[]>(`/cars/${carId}/parts`),
    enabled: activeTab === "Parts",
  });

  const insuranceQuery = useQuery<InsuranceRecord[]>({
    queryKey: ["insurance", carId],
    queryFn: () => apiGet<InsuranceRecord[]>(`/cars/${carId}/insurance`),
    enabled: activeTab === "Insurance",
  });

  const dealershipQuery = useQuery<DealershipRecord[]>({
    queryKey: ["dealerships", carId],
    queryFn: () => apiGet<DealershipRecord[]>(`/cars/${carId}/dealerships`),
    enabled: activeTab === "Dealerships",
  });

  const fuelQuery = useQuery<FuelRecord[]>({
    queryKey: ["fuel", carId],
    queryFn: () => apiGet<FuelRecord[]>(`/cars/${carId}/fuel`),
    enabled: activeTab === "Fuel",
  });

  const eventsQuery = useQuery<EventItem[]>({
    queryKey: ["events", carId],
    queryFn: () => apiGet<EventItem[]>(`/cars/${carId}/events`),
    enabled: activeTab === "Events",
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/maintenance`, {
        type: mType,
        description: mDesc,
        date: mDate,
        mileage: mMileage ? parseInt(mMileage) : undefined,
        cost: mCost ? parseFloat(mCost) : undefined,
        shop: mShop || undefined,
        nextDueDate: mNextDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddMaintenance(false);
      setMType(""); setMDesc(""); setMCost(""); setMShop(""); setMNextDate(""); setMMileage("");
    },
  });

  const addPartsMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/parts`, {
        name: pName,
        brand: pBrand || undefined,
        category: pCategory || "General",
        cost: pCost ? parseFloat(pCost) : undefined,
        supplier: pSupplier || undefined,
        installedDate: pDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddParts(false);
      setPName(""); setPBrand(""); setPCategory(""); setPCost(""); setPSupplier("");
    },
  });

  const addInsuranceMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/insurance`, {
        provider: iProvider,
        policyNumber: iPolicy,
        type: iType,
        premium: iPremium ? parseFloat(iPremium) : undefined,
        startDate: iStart,
        endDate: iEnd || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddInsurance(false);
      setIProvider(""); setIPolicy(""); setIPremium(""); setIEnd("");
    },
  });

  const addDealershipMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/dealerships`, {
        name: dName,
        visitDate: dDate,
        purpose: dPurpose,
        cost: dCost ? parseFloat(dCost) : undefined,
        phone: dPhone || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealerships", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddDealership(false);
      setDName(""); setDPurpose(""); setDCost(""); setDPhone("");
    },
  });

  const addFuelMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/fuel`, {
        date: fDate,
        mileage: parseInt(fMileage),
        liters: parseFloat(fLiters),
        totalCost: parseFloat(fCost),
        fuelType: fType || undefined,
        station: fStation || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddFuel(false);
      setFMileage(""); setFLiters(""); setFCost(""); setFStation("");
    },
  });

  const completeEvent = (recordType: string, recordId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    apiPost(`/cars/${carId}/events/complete`, { recordType, recordId })
      .then(() => qc.invalidateQueries({ queryKey: ["events", carId] }));
  };

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", confirmLabel: "", onConfirm: () => {} });

  const deleteRecord = (path: string, queryKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmModal({
      visible: true,
      title: "Delete",
      message: "Delete this record?",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmModal((s) => ({ ...s, visible: false }));
        await apiDelete(path);
        qc.invalidateQueries({ queryKey: [queryKey, carId] });
        qc.invalidateQueries({ queryKey: ["events", carId] });
      },
    });
  };

  const car = carQuery.data;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (carQuery.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (!car) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <Text style={{ color: C.text }}>Car not found</Text>
      </View>
    );
  }

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === "Events") {
      router.push("/event/add");
      return;
    }
    if (activeTab === "Maintenance") setShowAddMaintenance(true);
    else if (activeTab === "Parts") setShowAddParts(true);
    else if (activeTab === "Insurance") setShowAddInsurance(true);
    else if (activeTab === "Dealerships") setShowAddDealership(true);
    else if (activeTab === "Fuel") setShowAddFuel(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.carName, { color: C.text }]} numberOfLines={1}>
            {car.nickname ?? `${car.year} ${car.make} ${car.model}`}
          </Text>
          <Text style={[styles.plate, { color: C.textSecondary }]} numberOfLines={1}>
            {car.nickname ? `${car.year} ${car.make} ${car.model}` : car.licensePlate ?? ""}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/car/edit", params: { id: String(carId) } });
            }}
            hitSlop={8}
            style={[styles.headerBtn, { backgroundColor: C.backgroundTertiary }]}
          >
            <Feather name="edit-2" size={16} color={C.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/report/[id]", params: { id: String(carId) } });
            }}
            hitSlop={8}
            style={[styles.headerBtn, { backgroundColor: C.infoLight }]}
          >
            <Feather name="file-text" size={16} color={C.info} />
          </Pressable>
        </View>
      </View>

      {/* Car Stats Strip */}
      <View style={[styles.statsStrip, { backgroundColor: C.card }]}>
        {car.mileage != null && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{car.mileage.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>km</Text>
          </View>
        )}
        {car.vin && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>{car.vin.slice(-6)}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>VIN</Text>
          </View>
        )}
        {car.color && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{car.color}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Color</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab ? C.tint : C.backgroundTertiary,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? "#fff" : C.textSecondary },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentPadding,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title={activeTab}
          actionLabel={activeTab === "Events" ? "Add Event" : `Add ${activeTab}`}
          onAction={openAdd}
        />

        {activeTab === "Events" && (
          eventsQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : !eventsQuery.data || eventsQuery.data.length === 0 ? (
            <EmptyState
              icon="clock"
              title="No events yet"
              description="Start logging maintenance, malfunctions, fuel, and more."
              actionLabel="Add Event"
              onAction={() => router.push("/event/add")}
            />
          ) : (
            eventsQuery.data.map((ev) => {
              const cfg = EVENT_TYPE_CONFIG[ev.type];
              const deleteMap: Record<EventItem["type"], { path: string; queryKey: string }> = {
                maintenance: { path: `/cars/${carId}/maintenance/${ev.id}`, queryKey: "maintenance" },
                parts: { path: `/cars/${carId}/parts/${ev.id}`, queryKey: "parts" },
                insurance: { path: `/cars/${carId}/insurance/${ev.id}`, queryKey: "insurance" },
                dealership: { path: `/cars/${carId}/dealerships/${ev.id}`, queryKey: "dealerships" },
                fuel: { path: `/cars/${carId}/fuel/${ev.id}`, queryKey: "fuel" },
                malfunction: { path: `/cars/${carId}/malfunctions/${ev.id}`, queryKey: "malfunctions" },
              };
              const del = deleteMap[ev.type];
              return (
                <RecordCard
                  key={`${ev.type}-${ev.id}`}
                  icon={cfg.icon}
                  iconColor={cfg.color}
                  iconBg={cfg.bg}
                  title={ev.title}
                  subtitle={`${cfg.label} · ${ev.subtitle}`}
                  rightText={ev.date}
                  onComplete={() => completeEvent(ev.type, ev.id)}
                  onDelete={() => deleteRecord(del.path, del.queryKey)}
                />
              );
            })
          )
        )}

        {activeTab === "Maintenance" && (
          maintenanceQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : maintenanceQuery.data?.length === 0 ? (
            <EmptyState
              icon="tool"
              title="No maintenance records"
              description="Log your first maintenance entry."
              actionLabel="Add Entry"
              onAction={() => setShowAddMaintenance(true)}
            />
          ) : (
            maintenanceQuery.data?.map((r) => (
              <RecordCard
                key={r.id}
                icon="tool"
                iconColor={Colors.light.warning}
                iconBg={Colors.light.warningLight}
                title={r.description}
                subtitle={`${r.type} · ${r.date}${r.shop ? ` · ${r.shop}` : ""}`}
                rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
                rightSubtext={r.mileage != null ? `${r.mileage.toLocaleString()} km` : undefined}
                onDelete={() => deleteRecord(`/cars/${carId}/maintenance/${r.id}`, "maintenance")}
              />
            ))
          )
        )}

        {activeTab === "Parts" && (
          partsQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : partsQuery.data?.length === 0 ? (
            <EmptyState
              icon="box"
              title="No parts records"
              description="Log replacement parts and components."
              actionLabel="Add Part"
              onAction={() => setShowAddParts(true)}
            />
          ) : (
            partsQuery.data?.map((r) => (
              <RecordCard
                key={r.id}
                icon="box"
                iconColor={Colors.light.success}
                iconBg={Colors.light.successLight}
                title={r.name}
                subtitle={`${r.category}${r.brand ? ` · ${r.brand}` : ""}${r.supplier ? ` · ${r.supplier}` : ""}`}
                rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
                rightSubtext={r.installedDate ?? undefined}
                onDelete={() => deleteRecord(`/cars/${carId}/parts/${r.id}`, "parts")}
              />
            ))
          )
        )}

        {activeTab === "Insurance" && (
          insuranceQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : insuranceQuery.data?.length === 0 ? (
            <EmptyState
              icon="shield"
              title="No insurance records"
              description="Track your car insurance policies."
              actionLabel="Add Insurance"
              onAction={() => setShowAddInsurance(true)}
            />
          ) : (
            insuranceQuery.data?.map((r) => (
              <RecordCard
                key={r.id}
                icon="shield"
                iconColor={Colors.light.info}
                iconBg={Colors.light.infoLight}
                title={`${r.provider}`}
                subtitle={`${r.type} · Policy: ${r.policyNumber}`}
                rightText={r.premium != null ? `$${r.premium.toFixed(2)}` : undefined}
                rightSubtext={r.endDate ? `Exp. ${r.endDate}` : `From ${r.startDate}`}
                onDelete={() => deleteRecord(`/cars/${carId}/insurance/${r.id}`, "insurance")}
              />
            ))
          )
        )}

        {activeTab === "Dealerships" && (
          dealershipQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : dealershipQuery.data?.length === 0 ? (
            <EmptyState
              icon="map-pin"
              title="No dealership visits"
              description="Log visits to dealerships and service centers."
              actionLabel="Add Visit"
              onAction={() => setShowAddDealership(true)}
            />
          ) : (
            dealershipQuery.data?.map((r) => (
              <RecordCard
                key={r.id}
                icon="map-pin"
                iconColor="#8B5CF6"
                iconBg="#EDE9FE"
                title={r.name}
                subtitle={`${r.purpose} · ${r.visitDate}`}
                rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
                rightSubtext={r.rating != null ? `${r.rating}/5` : undefined}
                onDelete={() => deleteRecord(`/cars/${carId}/dealerships/${r.id}`, "dealerships")}
              />
            ))
          )
        )}

        {activeTab === "Fuel" && (
          fuelQuery.isLoading ? (
            <ActivityIndicator color={C.tint} style={{ marginTop: 20 }} />
          ) : fuelQuery.data?.length === 0 ? (
            <EmptyState
              icon="droplet"
              title="No fuel records"
              description="Track your fuel fills and consumption."
              actionLabel="Add Fill-up"
              onAction={() => setShowAddFuel(true)}
            />
          ) : (
            fuelQuery.data?.map((r) => (
              <RecordCard
                key={r.id}
                icon="droplet"
                iconColor="#EF4444"
                iconBg="#FEE2E2"
                title={`${r.liters}L${r.fuelType ? ` · ${r.fuelType}` : ""}${r.station ? ` · ${r.station}` : ""}`}
                subtitle={`${r.date} · ${r.mileage.toLocaleString()} km`}
                rightText={`$${r.totalCost.toFixed(2)}`}
                onDelete={() => deleteRecord(`/cars/${carId}/fuel/${r.id}`, "fuel")}
              />
            ))
          )
        )}
      </ScrollView>

      {/* Add Maintenance Sheet */}
      <BottomSheet visible={showAddMaintenance} onClose={() => setShowAddMaintenance(false)} title="Add Maintenance">
        <FormField label="Type" value={mType} onChangeText={setMType} placeholder="e.g. Oil Change, Brake Service" required />
        <FormField label="Description" value={mDesc} onChangeText={setMDesc} placeholder="Describe the work done" required />
        <FormField label="Date" value={mDate} onChangeText={setMDate} placeholder="YYYY-MM-DD" required />
        <FormField label="Mileage (km)" value={mMileage} onChangeText={setMMileage} placeholder="Current odometer" keyboardType="number-pad" />
        <FormField label="Cost ($)" value={mCost} onChangeText={setMCost} placeholder="Total cost" keyboardType="decimal-pad" />
        <FormField label="Shop / Technician" value={mShop} onChangeText={setMShop} placeholder="Where was it done?" />
        <FormField label="Next Due Date" value={mNextDate} onChangeText={setMNextDate} placeholder="YYYY-MM-DD" />
        <PrimaryButton label="Save Record" onPress={() => addMaintenanceMutation.mutate()} loading={addMaintenanceMutation.isPending} disabled={!mType || !mDesc || !mDate} />
      </BottomSheet>

      {/* Add Parts Sheet */}
      <BottomSheet visible={showAddParts} onClose={() => setShowAddParts(false)} title="Add Part">
        <FormField label="Part Name" value={pName} onChangeText={setPName} placeholder="e.g. Air Filter" required />
        <FormField label="Category" value={pCategory} onChangeText={setPCategory} placeholder="e.g. Engine, Brakes, Electrical" required />
        <FormField label="Brand" value={pBrand} onChangeText={setPBrand} placeholder="e.g. Bosch, OEM" />
        <FormField label="Cost ($)" value={pCost} onChangeText={setPCost} placeholder="Part cost" keyboardType="decimal-pad" />
        <FormField label="Supplier" value={pSupplier} onChangeText={setPSupplier} placeholder="Where was it purchased?" />
        <FormField label="Install Date" value={pDate} onChangeText={setPDate} placeholder="YYYY-MM-DD" />
        <PrimaryButton label="Save Part" onPress={() => addPartsMutation.mutate()} loading={addPartsMutation.isPending} disabled={!pName} />
      </BottomSheet>

      {/* Add Insurance Sheet */}
      <BottomSheet visible={showAddInsurance} onClose={() => setShowAddInsurance(false)} title="Add Insurance">
        <FormField label="Provider" value={iProvider} onChangeText={setIProvider} placeholder="e.g. State Farm, Geico" required />
        <FormField label="Policy Number" value={iPolicy} onChangeText={setIPolicy} placeholder="Policy number" required />
        <FormField label="Type" value={iType} onChangeText={setIType} placeholder="e.g. Comprehensive, Liability" />
        <FormField label="Premium ($)" value={iPremium} onChangeText={setIPremium} placeholder="Premium amount" keyboardType="decimal-pad" />
        <FormField label="Start Date" value={iStart} onChangeText={setIStart} placeholder="YYYY-MM-DD" required />
        <FormField label="End Date" value={iEnd} onChangeText={setIEnd} placeholder="YYYY-MM-DD" />
        <PrimaryButton label="Save Insurance" onPress={() => addInsuranceMutation.mutate()} loading={addInsuranceMutation.isPending} disabled={!iProvider || !iPolicy || !iStart} />
      </BottomSheet>

      {/* Add Dealership Sheet */}
      <BottomSheet visible={showAddDealership} onClose={() => setShowAddDealership(false)} title="Add Dealership Visit">
        <FormField label="Dealership Name" value={dName} onChangeText={setDName} placeholder="e.g. City Toyota" required />
        <FormField label="Purpose" value={dPurpose} onChangeText={setDPurpose} placeholder="e.g. Service, Inspection, Purchase" required />
        <FormField label="Visit Date" value={dDate} onChangeText={setDDate} placeholder="YYYY-MM-DD" required />
        <FormField label="Cost ($)" value={dCost} onChangeText={setDCost} placeholder="Total cost" keyboardType="decimal-pad" />
        <FormField label="Phone" value={dPhone} onChangeText={setDPhone} placeholder="Dealership phone number" keyboardType="phone-pad" />
        <PrimaryButton label="Save Visit" onPress={() => addDealershipMutation.mutate()} loading={addDealershipMutation.isPending} disabled={!dName || !dPurpose || !dDate} />
      </BottomSheet>

      {/* Add Fuel Sheet */}
      <BottomSheet visible={showAddFuel} onClose={() => setShowAddFuel(false)} title="Add Fuel Fill-up">
        <FormField label="Date" value={fDate} onChangeText={setFDate} placeholder="YYYY-MM-DD" required />
        <FormField label="Odometer (km)" value={fMileage} onChangeText={setFMileage} placeholder="Current mileage" keyboardType="number-pad" required />
        <FormField label="Liters" value={fLiters} onChangeText={setFLiters} placeholder="Amount filled" keyboardType="decimal-pad" required />
        <FormField label="Total Cost ($)" value={fCost} onChangeText={setFCost} placeholder="Total paid" keyboardType="decimal-pad" required />
        <FormField label="Fuel Type" value={fType} onChangeText={setFType} placeholder="e.g. Regular, Premium, Diesel" />
        <FormField label="Station" value={fStation} onChangeText={setFStation} placeholder="Gas station name" />
        <PrimaryButton label="Save Fill-up" onPress={() => addFuelMutation.mutate()} loading={addFuelMutation.isPending} disabled={!fDate || !fMileage || !fLiters || !fCost} />
      </BottomSheet>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmStyle="destructive"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((s) => ({ ...s, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  carName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  plate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 24,
    shadowColor: "rgba(0,0,0,0.04)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  tabsScroll: { maxHeight: 48, marginBottom: 4 },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  content: { flex: 1 },
  contentPadding: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
