import axios from "axios";
import { config } from "../components/config";
import {
  getAllocationForUser,
  getUserAnnotationsForPost,
} from "../repository/allocation";
import ls from "local-storage";
import { saveAnnotations } from "../repository/annotation";
import _ from "lodash";
import { getUserStatus } from "../repository/user";
import { saveSession } from "../repository/session";

const DEFAULT_SESSION_VALUE = {
  postId: undefined, // for the post that was being annoted most recently
  postIndex: 0, // current post's index within this page of results
  pageNum: 0, // pageNum on which this post exists
};
const PAGESIZE = 20;

/*
Session includes all information you would need to resume an annotation session. 
If undefined, the annotator assumes this is a new session and assigns variables accordingly.
session : {
    activePostId : 0,
    activePostIndexInPage : 3,
    activePostPageNum : 10
}
*/

class Annotator {
  constructor(user, session) {
    this.user = user;
    this.session = session ? session : DEFAULT_SESSION_VALUE;
    this.pageSize = PAGESIZE;
    this.annotation = undefined;
    this.currentAnnotations = undefined;
  }

  async setup() {
    const { allocations, count } = await getAllocationForUser(
      this.user.id,
      this.session.pageNum
    );
    this.allocations = allocations;
    this.postCount = count;
    this.pageCount = Math.ceil(count / this.pageSize); // total number of pages that this user can annotate
    this.session.postId = this.allocations[this.session.postIndex].postId;
  }

  async makePageData(postId) {
    const { annotations: annotationRes } = await getUserAnnotationsForPost(
      this.user.id,
      postId
    );
    var annotations = {};
    annotationRes.map((annotation) => {
      annotations[annotation.key] = {
        id: annotation.id,
        value: annotation.value,
      };
    });

    this.currentAnnotations = annotations;

    const pageStatus = `${
      this.pageSize * this.session.pageNum + this.session.postIndex + 1
    }/${this.postCount}`;

    const post = this.allocations[this.session.postIndex].Post;

    const { status: userStatus } = await getUserStatus(this.user.id);
    console.log({ userStatus });

    return { annotations, pageStatus, post, userStatus };
  }

  /**
   * Check if annotator has reached the end of the current page (session.postIndexLocal == pageSize)
   * if no,
   *    update the fields in the session variable (postIndex++; postId = currentAllocation[postIndex])
   *    return true
   * if yes,
   *    check if you are on the last page (pageNum == totalPageCount)
   *    if no,
   *        get the next allocation page and update the session variables
   *        return true
   *    if yes
   *        return false
   */
  async next() {
    if (this.session.postIndex == this.pageSize - 1) {
      if (this.session.pageNum == this.pageCount) {
        return undefined;
      } else {
        this.session.pageNum++;
        const { allocations } = await getAllocationForUser(
          this.user.id,
          this.session.pageNum
        );
        this.allocations = allocations;
        this.session.postIndex = 0;
        this.session.postId = this.allocations[0].postId;
      }
    } else {
      if (this.session.postIndex != this.allocations.length - 1) {
        this.session.postIndex++;
        this.session.postId = this.allocations[this.session.postIndex].postId;
      } else {
        return undefined;
      }
    }

    return await this.makePageData(this.session.postId);
  }

  /**
   * Check if annotator has reached the start of the current page ()
   * if no,
   *    update the fields in the session variable
   *    return page data
   * if yes,
   *    check if annotator has reached the first page
   *    if yes,
   *        return undefined
   *    if no,
   *        return get the previous allocation page and update the session variables
   *        return page data
   */
  async previous() {
    if (this.session.postIndex == 0) {
      if (this.session.pageNum == 0) {
        return undefined;
      } else {
        this.session.pageNum--;
        const { allocations, count } = await getAllocationForUser(
          this.user.id,
          this.session.pageNum
        );
        this.allocations = allocations;
        this.session.postIndex = this.pageSize - 1;
        this.session.postId = this.allocations[this.session.postIndex].postId;
      }
    } else {
      this.session.postIndex--;
      this.session.postId = this.allocations[this.session.postIndex].postId;
    }

    return await this.makePageData(this.session.postId);
  }

  /**
   * Check if the annotations have changed. if they have, make an API call to save the annotations.
   */
  async saveAnnotations(annotations) {
    if (!_.isEqual(annotations, this.currentAnnotations)) {
      return saveAnnotations(this.user.id, this.session.postId, annotations);
    }
  }

  async saveSession() {
    return saveSession(this.user.id, this.session);
  }

  /**
   * Gets post from local storage and syncs them with the backend
   */
  async sync() {}

  getFormStatus(annotations) {
    return true;
    const { explicit, hate, dimension, ogbv } = annotations;
    if ((explicit && hate && dimension && ogbv) != undefined) {
      if (
        explicit.length != 0 &&
        hate.length != 0 &&
        dimension.length != 0 &&
        ogbv.length != 0
      ) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  get state() {
    return {
      user: this.user,
      session: this.session,
      allocations: this.allocations,
      pageCount: this.pageCount,
    };
  }
}

export { Annotator };
