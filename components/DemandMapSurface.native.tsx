import React from "react";
import { Text, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { LiveJob, formatZAR, getCategoryColor } from "../constants/useDemandData";
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
 * Native (iOS/Android) map surface — backed by react-native-maps.
 * This file is only ever resolved on native platforms; the .web.tsx
 * sibling is used for web builds instead, so react-native-maps (which
 * has no web implementation) never gets pulled into the web bundle.
 */
export default function DemandMapSurface({
  viewState,
  setViewState,
  filteredJobs,
  showPins,
  showLabels,
  alreadyBid,
  onPressJob,
}: DemandMapSurfaceProps) {
  return (
    <MapView
      style={{ width: "100%", height: "100%" }}
      initialRegion={{
        latitude: viewState.latitude,
        longitude: viewState.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
      onRegionChangeComplete={(region: Region) => {
        setViewState({
          latitude: region.latitude,
          longitude: region.longitude,
          zoom: viewState.zoom, // react-native-maps uses deltas instead of zoom, keep state intact
        });
      }}
    >
      {showPins &&
        filteredJobs.map((job) => {
          if (!job.location?.lat || !job.location?.lng) return null;
          const myBid = alreadyBid(job);
          const color = myBid ? "#10b981" : getCategoryColor(job.subService ?? job.service);
          const budget = job.budget ?? job.customerInitialBid ?? 0;

          return (
            <MapView.Marker
              key={job.id}
              coordinate={{
                latitude: job.location.lat,
                longitude: job.location.lng,
              }}
              onPress={() => onPressJob(job)}
            >
              <View style={[S.pin, { backgroundColor: color }]}>
                {showLabels ? (
                  <Text style={S.pinLabel}>{formatZAR(budget).replace("R ", "R")}</Text>
                ) : (
                  <View style={[S.pinDot, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                )}
                {myBid && <View style={S.bidCheckDot} />}
              </View>
            </MapView.Marker>
          );
        })}
    </MapView>
  );
}