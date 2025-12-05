'use server';

import { headers } from 'next/headers';
import { db } from '~/server/db';
import { member, organization, session as sessionTable } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '~/lib/auth';
import type { ActionResult } from './types';
import { logger } from '~/lib/logger';
import { getDbErrorMessage } from '~/lib/error-handling';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
  isActive: boolean;
}

/**
 * Get all organizations the current user belongs to
 */
export async function getUserOrganizationsAction(): Promise<ActionResult<UserOrganization[]>> {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    });

    if (!sessionData?.user) {
      return {
        success: false,
        message: 'Chưa đăng nhập.',
      };
    }

    const activeOrgId = (sessionData.session as { activeOrganizationId?: string })?.activeOrganizationId;

    // Get all memberships with org details
    const memberships = await db
      .select({
        orgId: organization.id,
        orgName: organization.name,
        orgSlug: organization.slug,
        orgLogo: organization.logo,
        memberRole: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, sessionData.user.id))
      .orderBy(member.createdAt);

    const orgs: UserOrganization[] = memberships.map((m) => ({
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      logo: m.orgLogo,
      role: m.memberRole,
      isActive: m.orgId === activeOrgId,
    }));

    return {
      success: true,
      data: orgs,
      message: 'Lấy danh sách tổ chức thành công.',
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching user organizations');
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể lấy danh sách tổ chức.'),
    };
  }
}

/**
 * Switch the active organization for the current user
 */
export async function switchOrganizationAction(organizationId: string): Promise<ActionResult<void>> {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    });

    if (!sessionData?.user) {
      return {
        success: false,
        message: 'Chưa đăng nhập.',
      };
    }

    // Verify user is a member of this organization
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, sessionData.user.id),
        eq(member.organizationId, organizationId)
      ),
    });

    if (!membership) {
      return {
        success: false,
        message: 'Bạn không phải là thành viên của tổ chức này.',
      };
    }

    // Update session's activeOrganizationId
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: organizationId })
      .where(eq(sessionTable.id, sessionData.session.id));

    // Get org name for logging
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    logger.info(
      { userId: sessionData.user.id, organizationId, orgName: org?.name },
      `User switched to organization: ${org?.name}`
    );

    return {
      success: true,
      message: `Đã chuyển sang tổ chức "${org?.name ?? organizationId}".`,
    };
  } catch (error) {
    logger.error({ error }, 'Error switching organization');
    return {
      success: false,
      message: getDbErrorMessage(error, 'Không thể chuyển tổ chức.'),
    };
  }
}
