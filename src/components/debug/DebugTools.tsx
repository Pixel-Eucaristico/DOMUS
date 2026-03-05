import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Pressable,
} from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { ALL_SEASONAL_TROPHIES, getTierColor } from "@packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { ALL_ACHIEVEMENTS, MONTHLY_TROPHIES } from "@packages/gamification/src/achievements";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ArchetypeType } from "@packages/personality/src/types";
import { getArchetypeDescription } from "@packages/personality/src/archetypeEngine";
import { AnimatedTrophy } from "@/src/components/gamification/AnimatedTrophy";
import { AnimatedSeasonalTrophy } from "@/src/components/gamification/AnimatedSeasonalTrophy";
import { LinearGradient } from "expo-linear-gradient";

const ARCHETYPES: ArchetypeType[] = [
  "EXPLORER",
  "ORGANIZER",
  "PLANNER",
  "STRATEGIST",
  "INVESTOR",
  "INDEPENDENT",
];

type TabType = "archetypes" | "trophies" | "state" | "triggers";

export function DebugTools() {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("archetypes");
  const [search, setSearch] = useState("");
  const [debugTier, setDebugTier] = useState<number>(1);
  const [selectedTrophy, setSelectedTrophy] = useState<any>(null);
  
  const { 
    theme, 
    debugArchetype, 
    setDebugArchetype, 
    setIsCatholic,
    setPendingToast,
    debugXp,
    setDebugXp,
    debugBalance,
    setDebugBalance,
    gamification,
    totalBalance,
    dispatch,
    deviceId,
    resetApp
  } = useAppState();

  if (!__DEV__) return null;

  const allTrophies = [
    ...(ALL_SEASONAL_TROPHIES || []).map(t => ({ ...t, _debugType: "Sazonal" })), 
    ...(ALL_LITURGICAL_TROPHIES || []).map(t => ({ ...t, _debugType: "Litúrgico" })),
    ...(ALL_ACHIEVEMENTS || []).map(t => ({ ...t, _debugType: "Conquista" })),
    ...(MONTHLY_TROPHIES || []).map(t => ({ ...t, _debugType: "Mensal" }))
  ].filter(Boolean);

  const filteredTrophies = allTrophies.filter(t => 
    t && typeof t.name === "string" && (
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      (t.id && typeof t.id === "string" && t.id.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const renderTrophyPreview = (t: any, size = 120, isStatic = false) => {
    if (t._debugType === "Sazonal" || t._debugType === "Litúrgico" || t._debugType === "Mensal") {
      const color = t._debugType === "Mensal" ? theme.primaryColor : getTierColor(debugTier);
      return (
        <AnimatedSeasonalTrophy 
          icon={t.icon} 
          id={t.id} 
          size={size} 
          color={color} 
          isLiturgical={t._debugType === "Litúrgico"}
          isStatic={isStatic}
        />
      );
    }
    return <AnimatedTrophy rarity={t.rarity || "gold"} size={size * 0.9} spinning={!isStatic} />;
  };

  return (
    <>
      <TouchableOpacity
        style={[st.toggleBtn, { backgroundColor: theme.primaryColor }]}
        onPress={() => setVisible(true)}
      >
        <Feather name="terminal" size={20} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.container, { backgroundColor: theme.background }]}>
            <View style={[st.header, { borderBottomColor: theme.border }]}>
              <Text style={[st.headerTitle, { color: theme.textColor }]}>Debug Kitchen Sink</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={24} color={theme.textColor} />
              </TouchableOpacity>
            </View>

            <View style={st.tabs}>
              {(["archetypes", "trophies", "state", "triggers"] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    st.tab,
                    activeTab === tab && { borderBottomColor: theme.primaryColor, borderBottomWidth: 2 }
                  ]}
                >
                  <Text style={[
                    st.tabText, 
                    { color: activeTab === tab ? theme.primaryColor : theme.secondaryText }
                  ]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={st.content}>
              {activeTab === "archetypes" && (
                <View style={st.section}>
                  <Text style={[st.sectionTitle, { color: theme.textColor }]}>Override Archetype</Text>
                  <Text style={[st.sectionDesc, { color: theme.secondaryText }]}>
                    Force application theme to any archetype regardless of transaction history.
                  </Text>
                  <View style={st.grid}>
                    <TouchableOpacity
                      style={[st.gridItem, !debugArchetype && st.gridItemActive, { borderColor: theme.border }]}
                      onPress={() => setDebugArchetype(null)}
                    >
                      <Text style={[st.gridItemText, { color: !debugArchetype ? theme.primaryColor : theme.textColor }]}>
                        Auto (Normal)
                      </Text>
                    </TouchableOpacity>
                    {ARCHETYPES.map(a => {
                      const info = getArchetypeDescription(a);
                      return (
                        <TouchableOpacity
                          key={a}
                          style={[st.gridItem, debugArchetype === a && st.gridItemActive, { borderColor: theme.border }]}
                          onPress={() => setDebugArchetype(a)}
                        >
                          <Text style={[st.gridItemText, { color: debugArchetype === a ? theme.primaryColor : theme.textColor }]}>
                            {info?.name || a}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {activeTab === "trophies" && (
                <View style={st.section}>
                  <View style={{ marginBottom: 15 }}>
                    <Text style={[st.label, { color: theme.textColor, marginBottom: 8 }]}>Troféu do Mês - Testar Nível (Tier):</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[1, 2, 3, 4].map(tier => (
                        <TouchableOpacity
                          key={tier}
                          onPress={() => setDebugTier(tier)}
                          style={[
                            st.tierBtn, 
                            { borderColor: getTierColor(tier) },
                            debugTier === tier && { backgroundColor: getTierColor(tier) + '22' }
                          ]}
                        >
                          <Text style={{ color: getTierColor(tier), fontWeight: '700', fontSize: 12 }}>T{tier}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TextInput
                    style={[st.search, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
                    placeholder="Search trophies..."
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {filteredTrophies.map((t, idx) => (
                    <TouchableOpacity 
                      key={`${t.id}-${t._debugType}-${idx}`} 
                      style={[st.trophyRow, { borderBottomColor: theme.border }]}
                      onPress={() => setSelectedTrophy(t)}
                    >
                      <View style={{ width: 50, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                         {/* Static preview for list performance */}
                         {renderTrophyPreview(t, 45, true)}
                      </View>
                      <View style={st.trophyInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[st.trophyName, { color: theme.textColor }]}>
                            {t.name}
                          </Text>
                          <View style={{ backgroundColor: theme.primaryColor + '22', paddingHorizontal: 4, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, color: theme.primaryColor, fontWeight: 'bold' }}>{t._debugType}</Text>
                          </View>
                        </View>
                        <Text style={[st.trophyId, { color: theme.secondaryText, fontSize: 10 }]}>{t.id}</Text>
                        <Text style={{ fontSize: 11, color: theme.secondaryText, marginTop: 4 }} numberOfLines={1}>
                          {t.description || "Clique para detalhes"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.border} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeTab === "state" && (
                <View style={st.section}>
                  <Text style={[st.sectionTitle, { color: theme.textColor }]}>App State Editor</Text>
                  <Text style={[st.sectionDesc, { color: theme.secondaryText }]}>
                    Manualmente modifique métricas para testar a interface.
                  </Text>

                  {/* XP Editor */}
                  <View style={[st.editorRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.label, { color: theme.textColor }]}>Total XP</Text>
                      <Text style={[st.subLabel, { color: theme.secondaryText }]}>Atual: {gamification.totalXp}</Text>
                    </View>
                    <TextInput
                      style={[st.input, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
                      keyboardType="numeric"
                      placeholder="XP..."
                      placeholderTextColor={theme.secondaryText}
                      value={debugXp?.toString() || ""}
                      onChangeText={(v) => setDebugXp(v ? parseInt(v) : null)}
                    />
                  </View>

                  {/* Balance Editor */}
                  <View style={[st.editorRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.label, { color: theme.textColor }]}>Saldo Total (R$)</Text>
                      <Text style={[st.subLabel, { color: theme.secondaryText }]}>Atual: {totalBalance.toFixed(2)}</Text>
                    </View>
                    <TextInput
                      style={[st.input, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
                      keyboardType="numeric"
                      placeholder="Saldo..."
                      placeholderTextColor={theme.secondaryText}
                      value={debugBalance?.toString() || ""}
                      onChangeText={(v) => setDebugBalance(v ? parseFloat(v) : null)}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[st.resetBtn, { borderColor: theme.danger }]}
                    onPress={() => {
                      setDebugXp(null);
                      setDebugBalance(null);
                    }}
                  >
                    <Text style={{ color: theme.danger, fontWeight: '700' }}>Resetar Modificações</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeTab === "triggers" && (
                <View style={st.section}>
                  <Text style={[st.sectionTitle, { color: theme.textColor }]}>UI Triggers</Text>
                  
                  <TouchableOpacity 
                    style={[st.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => setIsCatholic(null as any)}
                  >
                    <Text style={{ color: theme.textColor, fontWeight: '500' }}>Resetar Modal de Preferência Católica</Text>
                    <MaterialCommunityIcons name="church" size={20} color={theme.primaryColor} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[st.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => {
                      dispatch({
                        id: `debug-lvl-${Date.now()}`,
                        type: "LEVEL_UP",
                        payload: { previousLevel: gamification.level, newLevel: gamification.level + 1, totalXp: gamification.totalXp },
                        timestamp: Date.now(),
                        deviceId: deviceId || "debug",
                        signature: ""
                      } as any);
                      setVisible(false);
                    }}
                  >
                    <Text style={{ color: theme.textColor, fontWeight: '500' }}>Simular Level Up (Real)</Text>
                    <Feather name="trending-up" size={20} color={theme.primaryColor} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[st.actionBtn, { backgroundColor: theme.cardBackground, borderColor: theme.danger + '44' }]}
                    onPress={async () => {
                      await resetApp();
                      setVisible(false);
                      alert("App resetado com sucesso.");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.danger, fontWeight: '700' }}>Resetar TUDO (Estado Limpo)</Text>
                      <Text style={{ color: theme.secondaryText, fontSize: 10 }}>Apaga transações, troféus e XP.</Text>
                    </View>
                    <Feather name="trash-2" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Detailed Trophy Modal */}
        <Modal visible={!!selectedTrophy} transparent animationType="fade">
          <Pressable style={st.detailOverlay} onPress={() => setSelectedTrophy(null)}>
            <View style={[st.detailCard, { backgroundColor: theme.cardBackground }]}>
              {selectedTrophy && (
                <>
                  <LinearGradient
                    colors={[
                      (selectedTrophy._debugType === "Sazonal" || selectedTrophy._debugType === "Litúrgico" 
                        ? getTierColor(debugTier) 
                        : (selectedTrophy as any).rarity === "diamond" ? "#4FC3F7" : "#FFC107"
                      ) + "20",
                      "transparent"
                    ]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={st.detailHeader}>
                    <Text style={[st.detailType, { color: theme.primaryColor }]}>{selectedTrophy._debugType}</Text>
                    <TouchableOpacity onPress={() => setSelectedTrophy(null)}>
                      <Feather name="x" size={20} color={theme.secondaryText} />
                    </TouchableOpacity>
                  </View>

                  <View style={st.detailAnimWrapper}>
                    {renderTrophyPreview(selectedTrophy, 140, false)}
                  </View>

                  <Text style={[st.detailName, { color: theme.textColor }]}>{selectedTrophy.name}</Text>
                  <Text style={[st.detailId, { color: theme.secondaryText }]}>{selectedTrophy.id}</Text>

                  <View style={[st.detailGoalBox, { borderColor: theme.border, backgroundColor: theme.primaryColor + '08' }]}>
                    <Text style={[st.goalTitle, { color: theme.textColor }]}>Objetivo/Requisito:</Text>
                    <Text style={[st.goalText, { color: theme.textColor }]}>{selectedTrophy.description || "Sem descrição"}</Text>
                    
                    {(selectedTrophy as any).eventSummary && (
                      <View style={{ marginTop: 12 }}>
                         <Text style={[st.goalTitle, { color: theme.textColor }]}>História:</Text>
                         <Text style={[st.goalText, { color: theme.secondaryText, fontStyle: 'italic' }]}>{ (selectedTrophy as any).eventSummary }</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[st.detailActionBtn, { backgroundColor: theme.primaryColor }]}
                    onPress={() => {
                      const rarity = (selectedTrophy as any).rarity || (debugTier === 4 ? "diamond" : debugTier === 3 ? "gold" : "silver");
                      const now = new Date();
                      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

                      let eventType = "ACHIEVEMENT_UNLOCKED";
                      let payload: any = {
                        achievementId: selectedTrophy.id,
                        name: selectedTrophy.name,
                        description: selectedTrophy.description || (selectedTrophy as any).eventSummary || "",
                        rarity: rarity as any,
                        xpReward: (selectedTrophy as any).xpReward || 100,
                      };

                      if (selectedTrophy._debugType === "Mensal") {
                        eventType = "MONTHLY_TROPHY_COMPLETED";
                        payload = {
                          trophyId: selectedTrophy.id,
                          monthKey,
                          name: selectedTrophy.name,
                          description: selectedTrophy.description,
                          xpReward: selectedTrophy.xpReward,
                        };
                      } else if (selectedTrophy._debugType === "Sazonal" || selectedTrophy._debugType === "Litúrgico") {
                        eventType = "SEASONAL_TROPHY_COMPLETED";
                        payload = {
                          trophyId: selectedTrophy.id,
                          monthKey,
                          tier: debugTier as any,
                          name: selectedTrophy.name,
                          description: selectedTrophy.description,
                          xpReward: (selectedTrophy as any).xpReward || 100,
                        };
                      }
                      
                      dispatch({
                        id: `debug-${selectedTrophy.id}-${Date.now()}`,
                        type: eventType,
                        payload,
                        timestamp: Date.now(),
                        deviceId: deviceId || "debug",
                        signature: ""
                      } as any);

                      setSelectedTrophy(null);
                      setVisible(false);
                    }}
                  >
                    <Feather name="zap" size={16} color="#FFF" />
                    <Text style={st.detailActionText}>Ganhar Troféu Agora (Real)</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  toggleBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 9999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  tabs: {
    flexDirection: "row",
    marginVertical: 15,
    gap: 10,
    flexWrap: 'wrap',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: "45%",
  },
  gridItemActive: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  gridItemText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
  },
  search: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  trophyRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  trophyInfo: {
    flex: 1,
  },
  trophyName: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  trophyId: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
  subLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  input: {
    width: 100,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
  },
  resetBtn: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  tierBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  // Detailed Modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  detailType: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailAnimWrapper: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  detailName: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  detailId: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    opacity: 0.5,
    marginBottom: 20,
  },
  detailGoalBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  goalTitle: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  detailActionText: {
    color: '#FFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
  }
});
