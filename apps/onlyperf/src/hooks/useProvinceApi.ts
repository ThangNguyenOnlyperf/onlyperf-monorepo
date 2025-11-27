import { type UseQueryResult, useQuery } from "@tanstack/react-query";

const PROVINCE_API_BASE = "https://provinces.open-api.vn/api";

export interface ProvinceData {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  phone_code: number;
  districts?: DistrictData[];
}

export interface DistrictData {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  province_code: number;
  wards?: WardData[];
}

export interface WardData {
  name: string;
  code: number;
  codename: string;
  division_type: string;
  district_code: number;
}

/**
 * Fetch all provinces from the Province API
 * Cached for 1 hour as provinces rarely change
 */
export function useProvinces(): UseQueryResult<ProvinceData[], Error> {
  return useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const response = await fetch(`${PROVINCE_API_BASE}/p/`);
      if (!response.ok) {
        throw new Error("Failed to fetch provinces");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

/**
 * Fetch districts for a specific province
 * Only enabled when provinceCode is provided
 */
export function useDistricts(
  provinceCode: number | null | undefined,
): UseQueryResult<DistrictData[], Error> {
  return useQuery({
    queryKey: ["districts", provinceCode],
    queryFn: async () => {
      const response = await fetch(
        `${PROVINCE_API_BASE}/p/${provinceCode}?depth=2`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch districts");
      }
      const data: ProvinceData = await response.json();
      return data.districts || [];
    },
    enabled: !!provinceCode, // Only fetch when provinceCode is provided
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/**
 * Fetch wards for a specific district
 * Only enabled when districtCode is provided
 */
export function useWards(
  districtCode: number | null | undefined,
): UseQueryResult<WardData[], Error> {
  return useQuery({
    queryKey: ["wards", districtCode],
    queryFn: async () => {
      const response = await fetch(
        `${PROVINCE_API_BASE}/d/${districtCode}?depth=2`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch wards");
      }
      const data: DistrictData = await response.json();
      return data.wards || [];
    },
    enabled: !!districtCode, // Only fetch when districtCode is provided
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24,
  });
}
