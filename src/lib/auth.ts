import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log('getCurrentUser: No userId from auth()');
      return null;
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user) {
      return user;
    }

    const clerk = await currentUser();
    if (!clerk) {
      console.log('getCurrentUser: No clerk user from currentUser()');
      return null;
    }

    const primaryEmail =
      clerk.emailAddresses.find((address) => address.id === clerk.primaryEmailAddressId)?.emailAddress ||
      clerk.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      console.error('getCurrentUser: Clerk user has no email address', { clerkId: clerk.id });
      throw new Error("Clerk user does not have an email address");
    }

    const legacyUser = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    const name =
      [clerk.firstName, clerk.lastName].filter(Boolean).join(" ").trim() ||
      clerk.username ||
      primaryEmail.split("@")[0];

    if (legacyUser) {
      console.log('getCurrentUser: Updating legacy user with clerkId', { userId: legacyUser.id, clerkId: clerk.id });
      user = await prisma.user.update({
        where: { id: legacyUser.id },
        data: {
          clerkId: clerk.id,
          name,
          image: clerk.imageUrl ?? legacyUser.image,
        },
      });
      return user;
    }

    console.log('getCurrentUser: Creating new user', { clerkId: clerk.id, email: primaryEmail });
    user = await prisma.user.create({
      data: {
        clerkId: clerk.id,
        email: primaryEmail,
        name,
        image: clerk.imageUrl,
      },
    });

    return user;
  } catch (error) {
    console.error('getCurrentUser error:', error);
    throw error;
  }
}