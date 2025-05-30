import { Post, User } from "@prisma/client";
import { prisma, supabase } from "./client";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// user features

export async function createUser(
  username: string,
  user_id: string,
  user_email: string,
  first_name: string,
  last_name: string,
  user_avatar_url: string
): Promise<User> {
  const existingUser = await prisma.user.findUnique({
    where: { user_email },
  });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  const user = await prisma.user.create({
    data: {
      username,
      user_id,
      user_email,
      first_name,
      last_name,
      user_avatar_url,
    },
  });
  return user;
}

export async function deleteUser(user_id: string): Promise<User> {
  const deletedUser = await prisma.user.delete({
    where: {
      user_id,
    },
  });
  return deletedUser;
}

export async function getUserId(username: string) {
  const user = await prisma.user.findUnique({
    where: { username: username },
    select: { user_id: true },
  });
  if (user) {
    return user.user_id;
  }
  return null;
}

export async function getUserInfo(userId: string) {
  return await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      first_name: true,
      last_name: true,
      user_avatar_url: true,
      username: true,
      user_id: true,
    },
  });
}

export async function updateUserProfileImage(
  user_id: string,
  user_avatar_url: string
) {
  await prisma.user.update({
    where: {
      user_id,
    },
    data: {
      user_avatar_url,
    },
  });
}

// posts feature
export async function createPost(
  post_content: string | null,
  post_image_location: string | null,
  post_image_url: string | null,
  user_id: string,
  post_image_thumbnail: string | null,
  post_image_aspect_ratio: string | null
): Promise<Post> {
  const post: Post = await prisma.post.create({
    data: {
      post_content,
      post_image_location,
      post_image_url,
      updateDate: new Date(),
      createDate: new Date(),
      user_id,
      post_image_thumbnail,
      post_image_aspect_ratio,
    },
  });
  return post;
}

export async function getUserIdFromPostId(postId: string) {
  return await prisma.post.findUnique({
    where: { post_id: postId },
    select: { user_id: true },
  });
}

export async function getAllPosts(
  userId: string,
  limit: number,
  lastCursor: string | null
) {
  const allPosts = await prisma.post.findMany({
    include: {
      likes: { select: { user_id: true } },
      user: {
        select: {
          user_avatar_url: true,
          first_name: true,
          last_name: true,
          username: true,
        },
      },
    },
    ...(lastCursor ? { cursor: { post_id: lastCursor }, skip: 1 } : {}),
    take: limit,
    orderBy: { updateDate: "desc" },
  });
  return allPosts;
}

export async function getPostsofUser(userId: string, currentUserId: string) {
  const posts = await prisma.post.findMany({
    where: {
      user_id: userId,
    },
    include: {
      likes: { where: { user_id: currentUserId }, select: { id: true } },
      user: {
        select: {
          user_avatar_url: true,
          first_name: true,
          last_name: true,
          username: true,
        },
      },
    },
    orderBy: { updateDate: "desc" },
  });
  return posts;
}

export async function updatePost(post_id: string, post: Post): Promise<Post> {
  const updatedPost = await prisma.post.update({
    where: {
      post_id,
    },
    data: post,
  });
  return updatedPost;
}

export async function deletePost(post_id: string): Promise<Post> {
  const deletedPost = await prisma.post.delete({
    where: {
      post_id,
    },
  });
  return deletedPost;
}

export async function uploadImage(
  bucketName: string,
  fileLocation: string,
  file: File
) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileLocation, file);

  return { data, error };
}

export async function deleteImage(
  bucketName: string,
  folderName: string,
  subFolder: string,
  fileName: string,
  fileExtention: string
) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([`${folderName}/${subFolder}/${fileName}.${fileExtention}`]);
  return { data, error };
}

export function getImageUrl(bucketName: string, fileLocation: string) {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileLocation);
  return data.publicUrl;
}

// Generate unique name for files

export function generateUniqueNameforFiles(file: File) {
  const fileId = uuidv4();
  const fileName = file.name;
  const fileExtention = path.extname(fileName);
  const uploadFileName = `${fileId}${fileExtention}`;
  return { uploadFileName };
}

// Friends feature

export async function getFriendsSuggestions(
  userId: string,
  limit: number,
  lastCursor: string | null
) {
  const suggestions = await prisma.user.findMany({
    where: {
      AND: [
        { user_id: { not: userId } },
        {
          NOT: {
            OR: [
              {
                sentRequests: {
                  some: {
                    requester_id: userId,
                    status: { in: ["ACCEPTED", "PENDING"] },
                  },
                },
              },
              {
                receivedRequests: {
                  some: {
                    receiver_id: userId,
                    status: { in: ["ACCEPTED", "PENDING"] },
                  },
                },
              },
            ],
          },
        },
      ],
    },
    select: {
      user_id: true,
      username: true,
      first_name: true,
      last_name: true,
      user_avatar_url: true,
    },
    take: limit,
    ...(lastCursor ? { cursor: { user_id: lastCursor }, skip: 1 } : {}),
  });
  return suggestions;
}

export async function searchFriends(userId: string, query: string | null) {
  if (!query) {
    return [];
  }
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { user_id: { not: userId } },
        {
          OR: [
            { first_name: { contains: query, mode: "insensitive" } },
            { last_name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    // select: {},
  });
  return users;
}

// export async function isFriendRequestPending(
//   userId: string,
//   targetUserId: string
// ): Promise<boolean> {
//   const friendship = await prisma.friendship.findFirst({
//     where: {
//       AND: [
//         {
//           OR: [
//             { requester_id: userId, receiver_id: targetUserId },
//             { requester_id: targetUserId, receiver_id: userId },
//           ],
//         },
//         { status: "PENDING" },
//       ],
//     },
//   });
//   if (friendship) {
//     return true;
//   }
//   return false;
// }

export async function sendFriendRequest(userId: string, targetUserId: string) {
  const friendshipRecordAlreadyExists = await prisma.friendship.findFirst({
    where: {
      AND: [
        {
          OR: [
            { requester_id: userId, receiver_id: targetUserId },
            { requester_id: targetUserId, receiver_id: userId },
          ],
        },
        { OR: [{ status: "REJECTED" }, { status: "UNFRIENDED" }] },
      ],
    },
  });
  if (friendshipRecordAlreadyExists) {
    const friendship = await prisma.friendship.update({
      where: { friendship_id: friendshipRecordAlreadyExists.friendship_id },
      data: {
        requester_id: userId,
        receiver_id: targetUserId,
        status: "PENDING",
        createdDate: new Date(),
      },
    });
    return friendship.friendship_id;
  }
  const friendship = await prisma.friendship.create({
    data: {
      requester_id: userId,
      receiver_id: targetUserId,
      createdDate: new Date(),
    },
  });
  return friendship.friendship_id;
}

export async function acceptFriendRequest(
  userId: string,
  targetUserId: string
) {
  const friendship = await prisma.friendship.update({
    where: {
      requester_id_receiver_id: {
        receiver_id: userId,
        requester_id: targetUserId,
      },
    },
    data: { status: "ACCEPTED" },
  });
  return friendship;
}

export async function rejectFriendRequest(
  userId: string,
  targetUserId: string
) {
  const rejectedFriendShip = await prisma.friendship.update({
    where: {
      requester_id_receiver_id: {
        receiver_id: userId,
        requester_id: targetUserId,
      },
    },
    data: { status: "REJECTED" },
  });
  return rejectedFriendShip;
}

export async function getPendingFriendRequests(
  userId: string,
  limit: number,
  lastCursor: string | null
) {
  const requesters = await prisma.friendship.findMany({
    where: { AND: [{ receiver_id: userId }, { status: "PENDING" }] },
    select: {
      friendship_id: true,
      requester: {
        select: {
          username: true,
          first_name: true,
          last_name: true,
          user_avatar_url: true,
        },
      },
    },
    take: limit,
    orderBy: { createdDate: "desc" },
    ...(lastCursor ? { skip: 1, cursor: { friendship_id: lastCursor } } : {}),
  });
  const friendRequests = requesters.map((requester) => {
    return { friendship_id: requester.friendship_id, ...requester.requester };
  });
  return friendRequests;
}

export async function getFriendList(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      AND: [
        { OR: [{ requester_id: userId }, { receiver_id: userId }] },
        { status: "ACCEPTED" },
      ],
    },
    include: {
      requester: {
        select: {
          first_name: true,
          last_name: true,
          user_avatar_url: true,
          username: true,
          user_id: true,
        },
      },
      receiver: {
        select: {
          first_name: true,
          last_name: true,
          user_avatar_url: true,
          username: true,
          user_id: true,
        },
      },
    },
  });

  const friendList = friendships.map((friendship) => {
    if (friendship.requester_id === userId) {
      return {
        username: friendship.receiver.username,
        first_name: friendship.receiver.first_name,
        last_name: friendship.receiver.last_name,
        user_avatar_url: friendship.receiver.user_avatar_url,
        user_id: friendship.receiver.user_id,
      };
    } else {
      return {
        username: friendship.requester.username,
        first_name: friendship.requester.first_name,
        last_name: friendship.requester.last_name,
        user_avatar_url: friendship.requester.user_avatar_url,
        user_id: friendship.requester.user_id,
      };
    }
  });

  return friendList;
}

export async function removeFriend(userId: string, targetUserId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requester_id: userId, receiver_id: targetUserId },
        { requester_id: targetUserId, receiver_id: userId },
      ],
    },
  });

  const removedFriendship = await prisma.friendship.update({
    where: { friendship_id: friendship?.friendship_id },
    data: { status: "UNFRIENDED" },
  });

  return removedFriendship;
}

export async function getfriendRequestsCount(userId: string) {
  return await prisma.friendship.count({
    where: { receiver_id: userId, status: "PENDING" },
  });
}

// Post Like feature

// export async function isPostLiked(
//   postId: string,
//   userId: string
// ): Promise<boolean> {
//   const postLiked = await prisma.like.findUnique({
//     where: { post_id_user_id: { post_id: postId, user_id: userId } },
//   });
//   if (postLiked) {
//     return true;
//   }
//   return false;
// }

export async function likePost(postId: string, userId: string) {
  const [postLiked] = await prisma.$transaction([
    prisma.like.create({
      data: { post_id: postId, user_id: userId },
    }),
    prisma.post.update({
      where: { post_id: postId },
      data: { likes_count: { increment: 1 } },
    }),
  ]);

  return postLiked.id;
}

export async function removePostLike(postId: string, userId: string) {
  const [removedLike] = await prisma.$transaction([
    prisma.like.delete({
      where: { post_id_user_id: { post_id: postId, user_id: userId } },
    }),
    prisma.post.update({
      where: { post_id: postId },
      data: { likes_count: { decrement: 1 } },
    }),
  ]);
  return removedLike;
}

// Notification feature

interface ICreateNotification {
  userId: string;
  actorId: string;
  postId?: string | null;
  commentId?: string | null;
  friendshipId?: string | null;
}
export async function createNotification({
  userId,
  actorId,
  postId,
  commentId,
  friendshipId,
}: ICreateNotification) {
  if (userId === actorId) {
    return;
  }
  if (commentId) {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        actor_id: actorId,
        comment_id: commentId,
        type: "COMMENT",
      },
    });
  }
  if (postId) {
    console.log(postId);
    await prisma.notifications.create({
      data: {
        user_id: userId,
        actor_id: actorId,
        post_id: postId,
        type: "LIKE",
      },
    });
  }
  if (friendshipId) {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        actor_id: actorId,
        friendshi_id: friendshipId,
        type: "FRIENDREQUEST",
      },
    });
  }
  return;
}

export async function getNotifications(
  userId: string,
  limit: number,
  lastCursor: string | null
) {
  const [notifications, unreadPostsCount] = await prisma.$transaction([
    prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { createdDate: "desc" },
      take: limit,
      ...(lastCursor
        ? { skip: 1, cursor: { notification_id: lastCursor } }
        : {}),
    }),
    prisma.notifications.count({
      where: { AND: [{ user_id: userId }, { is_read: false }] },
    }),
  ]);

  return { notifications, unreadPostsCount };
}

export async function readNotification(notificationId: string) {
  await prisma.notifications.update({
    where: { notification_id: notificationId },
    data: { is_read: true },
  });
}

export async function getNotificationsCount(userId: string) {
  return await prisma.notifications.count({
    where: { user_id: userId, is_read: false },
  });
}
