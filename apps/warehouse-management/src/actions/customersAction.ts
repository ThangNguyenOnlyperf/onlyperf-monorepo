"use server"
import { db } from "~/server/db";
import { customers } from "~/server/db/schema";

export async function getCustomer(){
  try{
    const customer = await db.select().from(customers)
    return {
      success:true,
      data:customer,
      message:"Thành công khi lấy danh sách"
    };
  }catch(error){
    return {
      success:false,
      message:error,
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