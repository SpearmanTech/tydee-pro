import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { LiveJob, formatZAR, getCategoryColor, getTimeAgo } from "../constants/useDemandData";
import { S } from "../utils/demandzones.styles";

type ViewState = { latitude: number; longitude: number; zoom: number };

interface DemandMapSurfaceProps {
  viewState: ViewState;
  setViewState: (v: ViewState) => void;
  filteredJobs: LiveJob[];
  showPins: boolean;
  showLabels: boolean;
  alreadyBid: (job: LiveJob) => boolean;
  onPressJob: (job: LiveJob) => void;
}

/**
 * Web map surface — react-native-maps has no web implementation, so on
 * web we render the same job set as a scrollable list instead of a map.
 * This file is only ever resolved for web builds; native platforms use
 * the .native.tsx sibling.
 */
export default function DemandMapSurface({
  filteredJobs,
  alreadyBid,
  onPressJob,
}: DemandMapSurfaceProps) {
  return (
    <ScrollView
      style={S.webListSurface}
      contentContainerStyle={S.webListContent}
      showsVerticalScrollIndicator={false}
    >
      {filteredJobs.length === 0 ? (
        <View style={S.webListEmpty}>
          <MapPin size={28} color="#475569" />
          <Text style={S.webListEmptyText}>No jobs match your filters</Text>
        </View>
      ) : (
        filteredJobs.map((job) => {
          const myBid = alreadyBid(job);
          const color = myBid ? "#10b981" : getCategoryColor(job.subService ?? job.service);
          const budget = job.budget ?? job.customerInitialBid ?? 0;

          return (
            <TouchableOpacity
              key={job.id}
              style={S.webListCard}
              onPress={() => onPressJob(job)}
              activeOpacity={0.8}
            >
              <View style={[S.webListAccent, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={S.webListCardTitle} numberOfLines={1}>
                  {job.title ?? job.subService ?? "Service Job"}
                </Text>
                <View style={S.webListMetaRow}>
                  <MapPin size={11} color="#64748b" />
                  <Text style={S.webListMetaText}>
                    {job.location?.city ?? "Durban"} · {getTimeAgo(job.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={S.webListBudget}>{formatZAR(budget)}</Text>
                {myBid && <Text style={S.webListBidTag}>Bid placed</Text>}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}