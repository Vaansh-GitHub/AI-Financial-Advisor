"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getClients,
  getGoals,
  getConversations,
  getReports,
  getResearchDocuments,
  getActivityLogs,
  getUploadedFiles,
  getAdviserSettings,
  getStorageUsage,
  STORAGE_CHANGE_EVENT,
  StorageUsageMetrics,
} from "./localStorage";
import {
  Client,
  Goal,
  ChatConversation,
  FinancialReport,
  ResearchDocument,
  ActivityLog,
  UploadedFileMeta,
  AdviserSettings,
} from "./types";

export function useStorageData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [research, setResearch] = useState<ResearchDocument[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [settings, setSettings] = useState<AdviserSettings | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsageMetrics | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshAll = useCallback(() => {
    try {
      setClients(getClients());
      setGoals(getGoals());
      setChats(getConversations());
      setReports(getReports());
      setResearch(getResearchDocuments());
      setActivity(getActivityLogs(30));
      setFiles(getUploadedFiles());
      setSettings(getAdviserSettings());
      setStorageUsage(getStorageUsage());
      setIsLoaded(true);
    } catch (err) {
      console.error("Error refreshing storage data:", err);
    }
  }, []);

  useEffect(() => {
    refreshAll();

    const handleStorageChange = () => {
      refreshAll();
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshAll]);

  return {
    clients,
    goals,
    chats,
    reports,
    research,
    activity,
    files,
    settings,
    storageUsage,
    isLoaded,
    refreshAll,
  };
}

