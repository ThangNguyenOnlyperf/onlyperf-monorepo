"use server"
import { db } from "~/server/db";
import { customers } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "~/lib/authorization";

export async function getCustomer(){
  try{
    const { organizationId } = await requireOrgContext();
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, organizationId));
    return {
      success:true,
      data:customer,
      message:"Thành công khi lấy danh sách"
    };
  }catch(error){
    return {
      success:false,
      message:error instanceof Error ? error.message : "Unknown error",
      data:[]
    }
  }
}

export interface Customer{
  id:string,
  name:string,
  phone:string,
  address:string,
  createdAt:Date,
  updatedAt:Date
}