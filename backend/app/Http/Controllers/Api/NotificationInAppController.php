<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationInApp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationInAppController extends Controller
{
    /**
     * GET /api/in-app-notifications — List notifications for current user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->get('filter', 'all'); // all, unread

        $query = NotificationInApp::forUser($user->id)
            ->orderByDesc('created_at');

        if ($filter === 'unread') {
            $query->unread();
        }

        return response()->json($query->paginate(20));
    }

    /**
     * GET /api/in-app-notifications/unread-count — Get unread count.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = NotificationInApp::forUser($user->id)->unread()->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * POST /api/in-app-notifications/{id}/read — Mark single notification as read.
     */
    public function markAsRead(NotificationInApp $notification): JsonResponse
    {
        $notification->markAsRead();
        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * POST /api/in-app-notifications/read-all — Mark all as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        NotificationInApp::forUser($user->id)->unread()->update(['read_at' => now()]);

        return response()->json(['message' => 'All marked as read']);
    }
}
