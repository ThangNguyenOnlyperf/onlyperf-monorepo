"use server"
import { db } from "~/server/db";
import { customers } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "~/lib/authorization";
import { getActionErrorMessage } from "~/lib/error-handling";

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
      message: getActionErrorMessage(error, "Không thể lấy danh sách khách hàng."),
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