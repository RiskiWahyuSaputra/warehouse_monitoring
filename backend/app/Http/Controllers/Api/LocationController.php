<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LocationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(
            Location::withSum('stockLevels as current_stock', 'quantity')->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'zone' => 'required|string|max:255',
            'rack' => 'required|string|max:255',
            'bin' => 'required|string|max:255',
            'capacity' => 'required|integer|min:0',
        ]);

        $location = Location::create($validated);

        return response()->json($location, Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(Location $location)
    {
        return response()->json($location);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Location $location)
    {
        $validated = $request->validate([
            'zone' => 'sometimes|required|string|max:255',
            'rack' => 'sometimes|required|string|max:255',
            'bin' => 'sometimes|required|string|max:255',
            'capacity' => 'sometimes|required|integer|min:0',
        ]);

        $location->update($validated);

        return response()->json($location);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Location $location)
    {
        $location->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
