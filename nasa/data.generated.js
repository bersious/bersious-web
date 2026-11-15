// AUTO-GENERATED — do not edit. Source of truth: data/*.json
// Regenerate: python scripts/build_data.py
export const DATA = {
  instruments: {
  "_meta": {
    "version": "0.1",
    "units": {
      "mass_kg": "kilograms",
      "power_w": "watts, average orbit draw",
      "cost_musd": "million USD, development + integration",
      "data_gb_day": "gigabytes generated per day of operations",
      "science_value": "0-100 abstract science return",
      "downlink_gb_day": "additional downlink capacity added (utility items only)"
    },
    "design_rule": "Every instrument must be a trade-off: nothing here is strictly better than another option at the same budget."
  },
  "instruments": [
    {
      "id": "cam_basic",
      "name": "Basic Optical Camera",
      "category": "imaging",
      "mass_kg": 12,
      "power_w": 15,
      "cost_musd": 3.0,
      "data_gb_day": 4,
      "science_value": 35,
      "resolution_m": 30,
      "blurb": "Cheap, light, always fits. Sees weather systems, not individual buildings.",
      "tradeoff": "Lowest science return of any imager — fine for a first mission, not for a science objective."
    },
    {
      "id": "cam_hires",
      "name": "High-Resolution Multispectral Camera",
      "category": "imaging",
      "mass_kg": 45,
      "power_w": 60,
      "cost_musd": 12.0,
      "data_gb_day": 20,
      "science_value": 70,
      "resolution_m": 10,
      "blurb": "The workhorse of Earth observation. 10 m ground sampling in 8 bands.",
      "tradeoff": "20 GB/day forces a serious downlink budget."
    },
    {
      "id": "cam_stereo",
      "name": "Stereo / 3D Imager",
      "category": "imaging",
      "mass_kg": 60,
      "power_w": 75,
      "cost_musd": 18.0,
      "data_gb_day": 35,
      "science_value": 75,
      "resolution_m": 15,
      "blurb": "Two cameras, one DEM. Measures terrain height and change.",
      "tradeoff": "Biggest data producer per unit of science — needs Ka-band or a relay."
    },
    {
      "id": "radar_sar",
      "name": "SAR Radar Imager",
      "category": "imaging",
      "mass_kg": 90,
      "power_w": 180,
      "cost_musd": 28.0,
      "data_gb_day": 40,
      "science_value": 85,
      "resolution_m": 5,
      "blurb": "Sees through cloud and darkness. Floods, subsidence, sea ice.",
      "tradeoff": "180 W is a power plant problem, not an instrument problem."
    },
    {
      "id": "lidar",
      "name": "LiDAR Altimeter",
      "category": "geodesy",
      "mass_kg": 35,
      "power_w": 55,
      "cost_musd": 14.0,
      "data_gb_day": 8,
      "science_value": 60,
      "resolution_m": 2,
      "blurb": "Centimetre-precision surface height. Ice sheets and oceans.",
      "tradeoff": "Only useful if your orbit actually repeats its ground track."
    },
    {
      "id": "spec_vnir",
      "name": "VNIR Spectrometer",
      "category": "spectroscopy",
      "mass_kg": 30,
      "power_w": 45,
      "cost_musd": 11.0,
      "data_gb_day": 10,
      "science_value": 72,
      "resolution_m": 20,
      "blurb": "Identifies materials from their reflected spectrum.",
      "tradeoff": "Needs sunlight — useless at night or in eclipse."
    },
    {
      "id": "spec_tir",
      "name": "Thermal IR Sounder",
      "category": "spectroscopy",
      "mass_kg": 55,
      "power_w": 90,
      "cost_musd": 18.0,
      "data_gb_day": 12,
      "science_value": 80,
      "resolution_m": 25,
      "blurb": "Temperature and humidity profiles. Works day and night.",
      "tradeoff": "Detector must be cooled — power and radiator area both climb."
    },
    {
      "id": "radiometer",
      "name": "Microwave Radiometer",
      "category": "sensing",
      "mass_kg": 40,
      "power_w": 70,
      "cost_musd": 16.0,
      "data_gb_day": 10,
      "science_value": 65,
      "resolution_m": 40,
      "blurb": "Soil moisture, sea-surface salinity, precipitation.",
      "tradeoff": "Large antenna aperture — mass lives in the structure, not the sensor."
    },
    {
      "id": "magnetometer",
      "name": "Magnetometer",
      "category": "space_physics",
      "mass_kg": 8,
      "power_w": 6,
      "cost_musd": 2.0,
      "data_gb_day": 0.5,
      "science_value": 45,
      "resolution_m": null,
      "blurb": "Tiny, cheap, barely drinks power. Maps the magnetic field.",
      "tradeoff": "Almost free — but magnetic cleanliness requirements constrain the whole bus."
    },
    {
      "id": "plasma",
      "name": "Plasma Analyzer",
      "category": "space_physics",
      "mass_kg": 18,
      "power_w": 30,
      "cost_musd": 9.0,
      "data_gb_day": 6,
      "science_value": 75,
      "resolution_m": null,
      "blurb": "Measures the charged particles that damage electronics.",
      "tradeoff": "Highly valuable in MEO/GEO where radiation is the risk."
    },
    {
      "id": "telescope",
      "name": "Space Telescope (0.3 m)",
      "category": "astronomy",
      "mass_kg": 210,
      "power_w": 300,
      "cost_musd": 55.0,
      "data_gb_day": 35,
      "science_value": 95,
      "resolution_m": 1,
      "blurb": "The highest science value in the catalogue.",
      "tradeoff": "210 kg + 300 W + 55M — it defines the entire mission around itself."
    },
    {
      "id": "transponder_ka",
      "name": "Ka-band High-Gain Terminal",
      "category": "utility",
      "mass_kg": 22,
      "power_w": 35,
      "cost_musd": 6.0,
      "data_gb_day": 0,
      "science_value": 0,
      "downlink_gb_day": 45,
      "blurb": "Not science — it buys you downlink capacity (+45 GB/day).",
      "tradeoff": "Pure enabler: mass, power and money spent on moving data instead of making it."
    }
  ],
  "bus_options": {
    "_note": "The spacecraft platform. Pick exactly one power source and one battery.",
    "power": [
      {
        "id": "solar_small",
        "name": "Deployable Solar Array — Small (5 m²)",
        "mass_kg": 25,
        "power_gen_w": 90,
        "cost_musd": 8.0,
        "blurb": "Cheap and light, but 90 W total generation — leave room for eclipse.",
        "tradeoff": "Cannot support SAR or a telescope."
      },
      {
        "id": "solar_medium",
        "name": "Deployable Solar Array — Medium (15 m²)",
        "mass_kg": 60,
        "power_gen_w": 260,
        "cost_musd": 18.0,
        "blurb": "The balanced choice: enough for most instrument suites.",
        "tradeoff": "60 kg of your launch capacity gone before you pick a single instrument."
      },
      {
        "id": "solar_large",
        "name": "Deployable Solar Array — Large (30 m²)",
        "mass_kg": 110,
        "power_gen_w": 520,
        "cost_musd": 32.0,
        "blurb": "Powers anything in the catalogue.",
        "tradeoff": "Dominates the mass budget; drag in LEO shortens lifetime."
      },
      {
        "id": "rtg",
        "name": "Radioisotope Generator (RTG)",
        "mass_kg": 45,
        "power_gen_w": 120,
        "cost_musd": 45.0,
        "blurb": "Works in eclipse and at any distance from the Sun.",
        "tradeoff": "45M for 120 W, and it decays: -0.8% power per year."
      }
    ],
    "battery": [
      {
        "id": "bat_small",
        "name": "Battery Pack — 400 Wh",
        "mass_kg": 12,
        "cost_musd": 2.0,
        "capacity_wh": 400,
        "blurb": "Covers a 35-minute eclipse for a light spacecraft."
      },
      {
        "id": "bat_medium",
        "name": "Battery Pack — 1200 Wh",
        "mass_kg": 32,
        "cost_musd": 5.0,
        "capacity_wh": 1200,
        "blurb": "Standard for LEO with imaging payloads."
      },
      {
        "id": "bat_large",
        "name": "Battery Pack — 3000 Wh",
        "mass_kg": 70,
        "cost_musd": 11.0,
        "capacity_wh": 3000,
        "blurb": "For high-draw payloads that must run through eclipse.",
        "tradeoff": "70 kg is two instruments' worth of mass."
      }
    ],
    "bus": [
      {
        "id": "bus_small",
        "name": "Small Satellite Bus (150 kg class)",
        "dry_mass_kg": 85,
        "cost_musd": 14.0,
        "max_instruments": 2,
        "power_overhead_w": 25,
        "blurb": "Structure, ADCS, OBC, thermal for a 150 kg satellite."
      },
      {
        "id": "bus_medium",
        "name": "Medium Satellite Bus (500 kg class)",
        "dry_mass_kg": 220,
        "cost_musd": 38.0,
        "max_instruments": 4,
        "power_overhead_w": 60,
        "blurb": "Room for a real instrument suite."
      },
      {
        "id": "bus_large",
        "name": "Large Satellite Bus (1500 kg class)",
        "dry_mass_kg": 620,
        "cost_musd": 85.0,
        "max_instruments": 6,
        "power_overhead_w": 140,
        "blurb": "Everything fits — and so does the bill."
      }
    ]
  },
  "engineering_rules": {
    "mass_margin_pct": 15,
    "power_margin_pct": 10,
    "battery_eclipse_minutes": 35,
    "ops_cost_musd_per_year": 6.5,
    "note": "Rule of thumb used by real mission designers: dry mass + 15% margin must fit the launcher."
  }
},
  orbits: {
  "_meta": {
    "version": "0.1",
    "note": "Simplified orbit model. Numbers are plausible, not flight-qualified.",
    "fields": {
      "revisit_hours": "time between two passes over the same target, single satellite",
      "comm_window_pct": "percent of each orbit with a usable ground link",
      "downlink_mbps": "raw downlink rate when in a comm window",
      "radiation_index": "0-1 relative dose; high values need rad-hard parts (+cost)",
      "base_lifetime_years": "propellant-limited lifetime before station-keeping runs out",
      "cost_multiplier": "applies to the bus cost (harder environment = pricier parts)"
    }
  },
  "orbits": [
    {
      "id": "leo_sso_400",
      "name": "LEO Sun-Synchronous 400 km",
      "altitude_km": 400,
      "inclination_deg": 97.4,
      "revisit_hours": 12,
      "comm_window_pct": 24,
      "downlink_mbps": 12,
      "radiation_index": 0.15,
      "base_lifetime_years": 3,
      "cost_multiplier": 1.0,
      "delta_v_to_reach_ms": 9400,
      "launcher_classes": [
        "small",
        "medium",
        "large"
      ],
      "blurb": "Constant lighting angle — the standard imaging orbit.",
      "tradeoff": "Only 24% of the orbit has a ground link, and atmospheric drag limits lifetime."
    },
    {
      "id": "leo_550",
      "name": "LEO 550 km (mid-inclination)",
      "altitude_km": 550,
      "inclination_deg": 53.0,
      "revisit_hours": 9,
      "comm_window_pct": 33,
      "downlink_mbps": 12,
      "radiation_index": 0.18,
      "base_lifetime_years": 4,
      "cost_multiplier": 1.02,
      "delta_v_to_reach_ms": 9450,
      "launcher_classes": [
        "small",
        "medium",
        "large"
      ],
      "blurb": "Better comm coverage over populated latitudes, faster revisit.",
      "tradeoff": "Inconsistent sun angle — harder to compare images over time."
    },
    {
      "id": "meo_20200",
      "name": "MEO 20,200 km",
      "altitude_km": 20200,
      "inclination_deg": 55.0,
      "revisit_hours": 48,
      "comm_window_pct": 62,
      "downlink_mbps": 20,
      "radiation_index": 0.55,
      "base_lifetime_years": 8,
      "cost_multiplier": 1.8,
      "delta_v_to_reach_ms": 12000,
      "launcher_classes": [
        "medium",
        "large"
      ],
      "blurb": "Wide coverage, long life, lots of comm time.",
      "tradeoff": "Terrible revisit for a single satellite, and radiation forces expensive parts."
    },
    {
      "id": "geo_35786",
      "name": "GEO 35,786 km",
      "altitude_km": 35786,
      "inclination_deg": 0.0,
      "revisit_hours": 0.02,
      "comm_window_pct": 96,
      "downlink_mbps": 60,
      "radiation_index": 0.7,
      "base_lifetime_years": 12,
      "cost_multiplier": 2.6,
      "delta_v_to_reach_ms": 13800,
      "launcher_classes": [
        "large"
      ],
      "blurb": "Sits still over one spot: ideal for comms and continuous weather watching.",
      "tradeoff": "Too far for any small imager to see detail — resolution penalty is severe."
    }
  ]
},
  launchers: {
  "_meta": {
    "version": "0.1",
    "note": "Payload capacity in kilograms including the 15% margin rule applied by the engine.",
    "classes": {
      "small": "can reach LEO/SSO only",
      "medium": "can reach LEO/SSO/MEO",
      "large": "can reach every orbit in orbits.json"
    }
  },
  "launchers": [
    {
      "id": "electron",
      "name": "Electron",
      "class": "small",
      "capacity_kg": {
        "leo_sso_400": 200,
        "leo_550": 220,
        "meo_20200": 0,
        "geo_35786": 0
      },
      "cost_musd": 7.5,
      "lead_time_months": 6,
      "blurb": "Cheap dedicated ride for a small satellite.",
      "tradeoff": "200 kg ceiling — a medium bus alone will not fit."
    },
    {
      "id": "falcon9_rideshare",
      "name": "Falcon 9 Rideshare (SSO)",
      "class": "small",
      "capacity_kg": {
        "leo_sso_400": 900,
        "leo_550": 900,
        "meo_20200": 0,
        "geo_35786": 0
      },
      "cost_musd": 6.0,
      "lead_time_months": 12,
      "blurb": "Cheapest per kilogram in history.",
      "tradeoff": "You do not choose the launch date, and you cannot pick MEO or GEO."
    },
    {
      "id": "falcon9_dedicated",
      "name": "Falcon 9 Dedicated",
      "class": "medium",
      "capacity_kg": {
        "leo_sso_400": 10000,
        "leo_550": 13000,
        "meo_20200": 6000,
        "geo_35786": 5000
      },
      "cost_musd": 67.0,
      "lead_time_months": 12,
      "blurb": "You pick the date and the orbit.",
      "tradeoff": "67M is 1/3 of a typical mission budget."
    },
    {
      "id": "ariane6",
      "name": "Ariane 6",
      "class": "large",
      "capacity_kg": {
        "leo_sso_400": 12000,
        "leo_550": 18000,
        "meo_20200": 8000,
        "geo_35786": 6500
      },
      "cost_musd": 90.0,
      "lead_time_months": 18,
      "blurb": "Heavy lift with excellent GEO performance.",
      "tradeoff": "18-month lead time: fine for planning, fatal for a 1-year scenario."
    },
    {
      "id": "falcon_heavy",
      "name": "Falcon Heavy",
      "class": "large",
      "capacity_kg": {
        "leo_sso_400": 25000,
        "leo_550": 30000,
        "meo_20200": 12000,
        "geo_35786": 12000
      },
      "cost_musd": 150.0,
      "lead_time_months": 15,
      "blurb": "For telescopes and anything absurdly heavy.",
      "tradeoff": "150M before a single instrument is bought."
    }
  ]
},
  events: {
  "_meta": {
    "version": "0.1",
    "note": "Random events are seeded per simulation run so runs are reproducible and shareable.",
    "fields": {
      "trigger_phase": "launch | commissioning | operations | deorbit",
      "probability": "chance the event fires in a given run, before difficulty modifiers",
      "effect": "applied by the simulation engine"
    }
  },
  "events": [
    {
      "id": "solar_flare",
      "name": "Solar Flare",
      "trigger_phase": "operations",
      "probability": 0.3,
      "severity": "medium",
      "effect": {
        "power_gen_pct": -12,
        "duration_days": 5
      },
      "narrative": "An X-class flare degrades the arrays for five days. Instruments draw more than the arrays produce.",
      "mitigation_hint": "A larger battery buys you through events like this. So does a power margin above 10%."
    },
    {
      "id": "camera_anomaly",
      "name": "Detector Anomaly",
      "trigger_phase": "commissioning",
      "probability": 0.22,
      "severity": "medium",
      "effect": {
        "science_pct": -18,
        "duration_days": 0
      },
      "narrative": "A pixel row in the main detector is dead. Science quality drops permanently.",
      "mitigation_hint": "Redundancy costs mass; a second instrument can absorb the loss."
    },
    {
      "id": "station_outage",
      "name": "Ground Station Outage",
      "trigger_phase": "operations",
      "probability": 0.28,
      "severity": "low",
      "effect": {
        "downlink_pct": -45,
        "duration_days": 10
      },
      "narrative": "A ground station antenna is offline for scheduled maintenance that was not scheduled.",
      "mitigation_hint": "Data backlog builds. Onboard storage and spare downlink capacity save you."
    },
    {
      "id": "launch_delay",
      "name": "Launch Delay",
      "trigger_phase": "launch",
      "probability": 0.35,
      "severity": "medium",
      "effect": {
        "schedule_slip_months": 3,
        "cost_pct": 6
      },
      "narrative": "A range conflict pushes launch by three months. Standing army of engineers still gets paid.",
      "mitigation_hint": "Budget reserve, or a launcher with a shorter lead time."
    },
    {
      "id": "debris_conjunction",
      "name": "Debris Conjunction",
      "trigger_phase": "operations",
      "probability": 0.25,
      "severity": "low",
      "effect": {
        "propellant_pct": -12,
        "lifetime_pct": -8
      },
      "narrative": "A close approach forces avoidance manoeuvres. Propellant is a finite resource.",
      "mitigation_hint": "Higher orbits need fewer manoeuvres but cost more to reach."
    },
    {
      "id": "battery_degradation",
      "name": "Battery Degradation",
      "trigger_phase": "operations",
      "probability": 0.2,
      "severity": "high",
      "effect": {
        "battery_capacity_pct": -22,
        "duration_days": 0
      },
      "narrative": "Cell imbalance cuts usable capacity by a fifth. Eclipse operations are now marginal.",
      "mitigation_hint": "Sizing the battery for 35 min of eclipse with margin, not exactly 35 min."
    },
    {
      "id": "thermal_excursion",
      "name": "Thermal Excursion",
      "trigger_phase": "operations",
      "probability": 0.18,
      "severity": "high",
      "effect": {
        "instrument_off_days": 14,
        "science_pct": -10
      },
      "narrative": "A radiator runs hot and the payload must be safed for two weeks.",
      "mitigation_hint": "Large buses have more thermal headroom than small ones."
    }
  ]
},
  scenarios: {
  "_meta": {
    "version": "0.1",
    "note": "Scenarios define the objective the player must satisfy. Objectives are checked by the engine against computed metrics.",
    "objective_fields": {
      "metric": "value computed by the simulation engine",
      "operator": "min | max",
      "target": "threshold to satisfy",
      "weight": "relative importance within the scenario (sums to 1.0)"
    }
  },
  "scenarios": [
    {
      "id": "climate_watch",
      "name": "Climate Watch",
      "difficulty": "beginner",
      "budget_musd": 180.0,
      "duration_months": 36,
      "story": "A climate agency needs continuous, comparable multispectral observations of land and ocean temperature for a 3-year climate record.",
      "objectives": [
        {
          "id": "o1",
          "label": "Multispectral imaging capability",
          "metric": "science_imaging",
          "operator": "min",
          "target": 130,
          "weight": 0.3,
          "explain": "Sum of science value across imaging-category instruments."
        },
        {
          "id": "o2",
          "label": "Thermal observation capability",
          "metric": "science_thermal",
          "operator": "min",
          "target": 60,
          "weight": 0.2,
          "explain": "Thermal IR or microwave radiometry on board."
        },
        {
          "id": "o3",
          "label": "Revisit time",
          "metric": "revisit_hours",
          "operator": "max",
          "target": 14,
          "weight": 0.15,
          "explain": "How often the satellite passes over the same target."
        },
        {
          "id": "o4",
          "label": "Mission lifetime",
          "metric": "lifetime_years",
          "operator": "min",
          "target": 3,
          "weight": 0.2,
          "explain": "Propellant-limited lifetime must cover the full record."
        },
        {
          "id": "o5",
          "label": "Data delivered",
          "metric": "data_delivered_pct",
          "operator": "min",
          "target": 90,
          "weight": 0.15,
          "explain": "Percent of generated data actually downlinked."
        }
      ],
      "hints": "A medium bus, medium array, hires camera + thermal sounder in SSO 400 fits comfortably. Watch the 20 GB/day downlink problem.",
      "designer_note": "Deliberately generous budget so the first playthrough is winnable."
    },
    {
      "id": "disaster_response",
      "name": "Disaster Response",
      "difficulty": "intermediate",
      "budget_musd": 120.0,
      "duration_months": 24,
      "story": "After a season of record floods, a regional government needs imagery within 6 hours of request — day or night, through cloud.",
      "objectives": [
        {
          "id": "o1",
          "label": "All-weather imaging",
          "metric": "science_radar",
          "operator": "min",
          "target": 80,
          "weight": 0.35,
          "explain": "SAR is the only instrument that sees through cloud and darkness."
        },
        {
          "id": "o2",
          "label": "Revisit time (single satellite)",
          "metric": "revisit_hours",
          "operator": "max",
          "target": 9,
          "weight": 0.3,
          "explain": "Floods move fast; a 12-hour revisit misses the peak. Sub-6h would need a constellation — out of scope."
        },
        {
          "id": "o3",
          "label": "Mission lifetime",
          "metric": "lifetime_years",
          "operator": "min",
          "target": 2,
          "weight": 0.15,
          "explain": "Must cover two flood seasons."
        },
        {
          "id": "o4",
          "label": "Data delivered",
          "metric": "data_delivered_pct",
          "operator": "min",
          "target": 85,
          "weight": 0.2,
          "explain": "SAR generates 40 GB/day — downlink is the hard part."
        }
      ],
      "hints": "SAR (180 W) + fast revisit forces either LEO 550 or a large array. Budget is tight: the Ka-band terminal may be worth more than a second science instrument.",
      "designer_note": "The intended lesson: sometimes the enabling hardware (comms) beats more science."
    },
    {
      "id": "space_weather",
      "name": "Space Weather Sentinel",
      "difficulty": "advanced",
      "budget_musd": 220.0,
      "duration_months": 60,
      "story": "Aviation and power-grid operators need continuous monitoring of solar-wind particles and the geomagnetic field for 5 years.",
      "objectives": [
        {
          "id": "o1",
          "label": "Particle measurement",
          "metric": "science_plasma",
          "operator": "min",
          "target": 70,
          "weight": 0.3,
          "explain": "Plasma analyzer on board."
        },
        {
          "id": "o2",
          "label": "Magnetic field measurement",
          "metric": "science_magnetometry",
          "operator": "min",
          "target": 40,
          "weight": 0.25,
          "explain": "Magnetometer on board."
        },
        {
          "id": "o3",
          "label": "Mission lifetime",
          "metric": "lifetime_years",
          "operator": "min",
          "target": 5,
          "weight": 0.25,
          "explain": "Five years of continuous coverage."
        },
        {
          "id": "o4",
          "label": "Comm availability",
          "metric": "comm_window_pct",
          "operator": "min",
          "target": 60,
          "weight": 0.2,
          "explain": "Alerts must reach the ground within minutes, not hours."
        }
      ],
      "hints": "The comm requirement pushes you toward MEO or GEO — where radiation is high and lifetime is long. Plasma analyzer earns its keep here.",
      "designer_note": "Teaches that orbit choice is driven by the objective, not by habit."
    }
  ]
}
};
