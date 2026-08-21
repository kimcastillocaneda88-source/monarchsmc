import "server-only";

import { countApplicationsByStatus } from "./applications";
import { countUpcomingEvents } from "./events";
import { countPendingGallery } from "./gallery";
import { countMembersByStatus } from "./members";
import { countUnreadMessages } from "./messages";
import { countUnpublishedNews } from "./news";
import { countUpcomingRides } from "./rides";

export interface AdminDashboardStats {
  activeMembers: number;
  pendingMembers: number;
  newApplications: number;
  reviewingApplications: number;
  upcomingRides: number;
  upcomingEvents: number;
  unpublishedArticles: number;
  pendingGallery: number;
  unreadMessages: number;
}

/**
 * Aggregate counts for the admin dashboard.
 * Uses Firestore aggregation queries so the dashboard never downloads
 * collections just to count them.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    activeMembers,
    pendingMembers,
    newApplications,
    reviewingApplications,
    upcomingRides,
    upcomingEvents,
    unpublishedArticles,
    pendingGallery,
    unreadMessages,
  ] = await Promise.all([
    countMembersByStatus("active"),
    countMembersByStatus("pending"),
    countApplicationsByStatus("new"),
    countApplicationsByStatus("reviewing"),
    countUpcomingRides(),
    countUpcomingEvents(),
    countUnpublishedNews(),
    countPendingGallery(),
    countUnreadMessages(),
  ]);

  return {
    activeMembers,
    pendingMembers,
    newApplications,
    reviewingApplications,
    upcomingRides,
    upcomingEvents,
    unpublishedArticles,
    pendingGallery,
    unreadMessages,
  };
}
