import React, { useEffect, useState } from "react";
import { graphql, navigate } from "gatsby";
import { Annotator } from "../controller/annotator";
import {
  Grommet,
  Header,
  Footer,
  Box,
  Text,
  Button,
  RadioButtonGroup,
  TextArea,
  Keyboard,
  CheckBoxGroup,
  Image,
  Anchor,
} from "grommet";
// import ReactJson from "react-json-view";
import TattleLogo from "../components/atoms/TattleLogo";
import TattleTheme from "../components/atoms/Theme";
import { LinkNext, LinkPrevious } from "grommet-icons";
import ReactRadioButtonGroup from "react-radio-button-group";
import { SimplePost } from "../components/atoms/SimplePost";
import { useTranslation, useI18next } from "gatsby-plugin-react-i18next";
import {
  getUserFromLS,
  getUserSessionFromLS,
  isLoggedIn,
  logoutUser,
} from "../repository/user";
import styled from "styled-components";

const RadioGroup = styled(ReactRadioButtonGroup)``;

var annotator;

/**
 * Notification is undefined or {type : info|error, text : ""}
 */

export default function PostAnnotator() {
  const { t } = useTranslation();
  const { languages, changeLanguage } = useI18next();
  const [debugMessage, setDebugMessage] = useState({});
  const [notification, setNotification] = useState(undefined);
  const [annotations, setAnnotations] = useState({});
  const [pageStatus, setPageStatus] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [post, setPost] = useState(undefined);

  useEffect(() => {
    async function setupAnnotator() {
      if (await isLoggedIn()) {
        const user = await getUserFromLS();
        let session = await getUserSessionFromLS();
        session = session ? session : undefined;
        console.log({ SESSION: session });
        const lang = user.lang;
        console.log({ lang });
        changeLanguage(lang);
        annotator = new Annotator({ id: user.id }, session);
        await annotator.setup();
        await refresh();
      } else {
        navigate("/login");
      }
    }
    // check if user is logged in

    setupAnnotator();
  }, []);

  function changeAnnotation(key, value) {
    setAnnotations({
      ...annotations,
      [key]: { id: annotations[key] ? annotations[key].id : undefined, value },
    });
  }

  async function refresh() {
    const data = await annotator.makePageData(annotator.session.postId);
    if (data != undefined) {
      const { annotations, pageStatus, post, userStatus } = data;
      // console.log("----");
      // console.log(annotations);
      // console.log("----");
      setAnnotations(annotations);
      setPageStatus(pageStatus);
      setDebugMessage(annotator.state);
      setPost(post);
      setUserStatus(userStatus);
    }
  }

  function showNotification(type, text) {
    setNotification({
      type,
      text,
    });
    setTimeout(() => {
      setNotification(undefined);
    }, 750);
  }

  async function goToNextPage() {
    if (annotator.getFormStatus(annotations)) {
      await annotator.saveAnnotations(annotations);
      showNotification("info", "Form Saved");
      await annotator.next();
      await refresh();
      await annotator.saveSession();
    } else {
      showNotification("error", "Form is incomplete");
    }
  }

  async function goToPreviousPage() {
    if (annotator.getFormStatus(annotations)) {
      await annotator.saveAnnotations(annotations);
      showNotification("info", "Form Saved");
      await annotator.previous();
      await refresh();
      await annotator.saveSession();
    } else {
      showNotification("error", "Form is incomplete");
    }
  }

  async function logout() {
    await logoutUser();
    navigate("/login");
  }

  useEffect(() => {
    console.log(post);
  }, [post]);

  return (
    <Grommet full theme={TattleTheme}>
      <Keyboard
        target="document"
        onRight={goToNextPage}
        onLeft={goToPreviousPage}
      >
        <Box fill gap={"small"} dir="column">
          <Header pad={"small"}>
            <TattleLogo brandName={t("app_name")} />
            <Box flex direction={"row"} gap={"medium"}>
              <Box
                width={"fit-content"}
                round={"small"}
                responsive
                background={"visuals-3"}
                pad={"small"}
                align={"center"}
              >
                <Text>{`pending : ${userStatus.pending}`}</Text>
              </Box>
              {notification ? (
                <Box
                  id={"notification_bar"}
                  background={
                    notification.type == "info" ? "visuals-9" : "status-error"
                  }
                  pad={"small"}
                  round={"small"}
                >
                  <Text>{notification.text}</Text>
                </Box>
              ) : null}
            </Box>
            {/* <Button
							label={"state"}
							onClick={() => console.log(annotator.state)}
						/> */}
            <Button plain label={"Logout"} onClick={logout} />
          </Header>

          <Box flex={"grow"} gap={"medium"}>
            <Box
              width={"large"}
              border
              direction={"column"}
              gap={"large"}
              alignSelf={"center"}
            >
              <Box flex={"grow"} gap={"medium"} pad={"medium"}>
                <Box
                  direction={"row-responsive"}
                  align={"center"}
                  gap={"medium"}
                >
                  <Text size={"large"}>{t("post_annotation")}</Text>
                  <Box
                    width={"fit-content"}
                    round={"small"}
                    responsive
                    pad={"small"}
                    alignSelf={"start"}
                  >
                    <Text>{pageStatus}</Text>
                    {/* <ReactJson collapsed={true} src={debugMessage} /> */}
                  </Box>
                  <Box direction={"row"} gap={"xsmall"}>
                    <Button
                      default
                      icon={<LinkPrevious size={"medium"} />}
                      onClick={goToPreviousPage}
                      focusIndicator={false}
                    />
                    <Button
                      secondary
                      icon={<LinkNext size={"medium"} />}
                      onClick={goToNextPage}
                      focusIndicator={false}
                    />
                  </Box>
                </Box>

                {post && (
                  <SimplePost post={post} annotationStatus={"pending"} />
                )}
                <Box gap={"medium"}>
                  <Box direction={"column"}>
                    <Text> {t("annotation_form_question_1")}</Text>

                    <ReactRadioButtonGroup
                      name="question_1"
                      options={[
                        { label: t("yes"), value: "1" },
                        { label: t("no"), value: "0" },
                      ]}
                      value={
                        annotations.question_1
                          ? annotations.question_1.value
                          : ""
                      }
                      onChange={(val) => changeAnnotation("question_1", val)}
                    />
                  </Box>
                  <Box direction={"column"}>
                    <Text> {t("annotation_form_question_2")}</Text>
                    <ReactRadioButtonGroup
                      name="question_2"
                      options={[
                        { label: t("yes"), value: "1" },
                        { label: t("no"), value: "0" },
                      ]}
                      value={
                        annotations.question_2
                          ? annotations.question_2.value
                          : ""
                      }
                      onChange={(val) => changeAnnotation("question_2", val)}
                    />
                  </Box>
                  <Box direction={"column"}>
                    <Text> {t("annotation_form_question_3")}</Text>
                    <ReactRadioButtonGroup
                      name="question_3"
                      options={[
                        { label: t("yes"), value: "1" },
                        { label: t("no"), value: "0" },
                      ]}
                      value={
                        annotations.question_3
                          ? annotations.question_3.value
                          : ""
                      }
                      onChange={(val) => changeAnnotation("question_3", val)}
                    />
                  </Box>

                  <TextArea
                    placeholder="Additional notes"
                    value={annotations.notes ? annotations.notes.value : ""}
                    onChange={(event) =>
                      changeAnnotation("notes", event.target.value)
                    }
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Footer pad="medium" gap={"small"}>
            <Box direction={"row-responsive"} align={"center"}>
              <Anchor href={"https://tattle.co.in"} target={"_blank"}>
                <Box height={"2.8em"}>
                  <svg
                    width="180"
                    height="58.8"
                    viewBox="0 0 150 49"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0)">
                      <path
                        d="M78.784 12.8H63.16C62.584 12.8 62.08 13.304 62.08 13.88C62.08 14.528 62.584 14.996 63.16 14.996H69.748V36.848C69.748 37.532 70.288 38.144 71.008 38.144C71.692 38.144 72.232 37.532 72.232 36.848V14.996H78.784C79.36 14.996 79.9 14.528 79.9 13.88C79.9 13.304 79.36 12.8 78.784 12.8ZM87.3641 19.064C83.3321 19.064 78.4361 22.232 78.4361 28.64C78.4361 35.12 83.3321 38.252 87.3641 38.252C90.3881 38.252 93.0161 36.524 94.0601 33.932V36.956C94.0601 37.604 94.6361 38.216 95.2841 38.216C95.9681 38.216 96.5441 37.604 96.5441 36.956V20.432C96.5441 19.748 96.0041 19.172 95.2841 19.172C94.6361 19.172 94.0601 19.748 94.0601 20.432V23.06C92.8361 20.432 90.1361 19.064 87.3641 19.064ZM87.6161 36.092C84.5561 36.092 80.8841 33.716 80.8841 28.64C80.8841 23.6 84.5561 21.224 87.6161 21.224C90.6761 21.224 94.2041 23.456 94.2041 28.64C94.2041 33.716 90.6761 36.092 87.6161 36.092ZM107.544 35.804C107.148 35.912 106.68 36.056 106.104 36.056C105.168 36.056 104.664 35.624 104.664 34.472V21.368H107.688C108.3 21.368 108.768 20.972 108.768 20.324C108.768 19.676 108.3 19.28 107.688 19.28H104.664V16.004C104.664 15.32 104.124 14.78 103.439 14.78C102.756 14.78 102.216 15.32 102.216 16.004V19.28H100.452C99.8395 19.28 99.4075 19.676 99.4075 20.324C99.4075 20.972 99.8395 21.368 100.452 21.368H102.216V34.616C102.216 37.532 103.872 38.18 105.6 38.18C106.968 38.18 108.768 37.82 108.768 36.632C108.768 36.02 108.228 35.588 107.544 35.804ZM118.688 35.804C118.292 35.912 117.824 36.056 117.248 36.056C116.312 36.056 115.808 35.624 115.808 34.472V21.368H118.832C119.444 21.368 119.912 20.972 119.912 20.324C119.912 19.676 119.444 19.28 118.832 19.28H115.808V16.004C115.808 15.32 115.268 14.78 114.584 14.78C113.9 14.78 113.36 15.32 113.36 16.004V19.28H111.596C110.984 19.28 110.552 19.676 110.552 20.324C110.552 20.972 110.984 21.368 111.596 21.368H113.36V34.616C113.36 37.532 115.016 38.18 116.744 38.18C118.112 38.18 119.912 37.82 119.912 36.632C119.912 36.02 119.372 35.588 118.688 35.804ZM125.585 36.92V13.52C125.585 12.872 125.045 12.296 124.361 12.296C123.677 12.296 123.137 12.872 123.137 13.52V36.92C123.137 37.568 123.677 38.18 124.361 38.18C125.045 38.18 125.585 37.568 125.585 36.92ZM138.346 19.064C134.242 19.064 129.202 22.232 129.202 28.64C129.202 35.12 134.098 38.18 138.634 38.18C140.902 38.18 143.098 37.496 144.61 36.128C145.15 35.624 145.294 35.3 145.294 34.976C145.294 34.436 144.934 34.004 144.322 34.004C143.998 34.004 143.71 34.184 143.242 34.544C142.018 35.552 140.434 36.092 138.706 36.092C135.43 36.092 132.01 34.04 131.722 29.612H145.762C146.77 29.612 147.346 29.144 147.346 28.208C147.346 22.268 142.45 19.064 138.346 19.064ZM138.346 21.224C141.262 21.224 144.682 23.24 144.97 27.632H131.722C132.046 23.24 135.466 21.224 138.346 21.224Z"
                        fill="#E76D67"
                      ></path>
                      )
                      <path
                        d="M24.5432 0.000155254C10.9609 -0.0862636 0 10.9033 0 24.4999C0 37.7652 10.5576 48.582 23.7222 48.9996V35.7055C13.4095 35.4607 5.73251 31.8599 5.73251 27.1213C5.73251 24.7448 7.69136 22.5267 11.2058 20.9711C11.3642 20.8847 11.4506 20.8847 11.6091 20.8127C12.2572 20.5678 12.9198 20.8127 13.251 21.4752C13.4959 22.1378 13.251 22.7859 12.6029 23.1172L12.2716 23.2756C9.73663 24.4279 8.26749 25.8106 8.26749 27.1213C8.26749 29.9875 15.1379 33.2714 24.9465 33.2714C34.7551 33.2714 41.6255 29.9875 41.6255 27.1213C41.6255 25.8106 40.1564 24.4135 37.6214 23.2756C36.9733 23.0308 36.7284 22.2962 36.9733 21.6337C37.2181 20.9711 37.9527 20.7263 38.6152 20.9711C42.1296 22.5267 44.0885 24.7448 44.0885 27.1213C44.0165 31.7735 36.6708 35.3311 26.5885 35.6911V48.9132C39.1049 47.8474 49 37.3619 49 24.4999C49 10.9753 38.0391 0.000155254 24.5432 0.000155254ZM29.93 22.4547L24.6152 27.611C24.4568 27.8558 24.1255 28.0143 23.7942 28.0143C23.463 28.0143 23.1461 27.9278 22.9012 27.683L20.3663 25.148C19.8765 24.6583 19.8765 23.9238 20.3663 23.4341C20.856 22.9444 21.5905 22.9444 22.0802 23.4341L23.7942 25.148L28.216 20.7263C28.7058 20.2366 29.4403 20.2366 29.93 20.7263C30.4198 21.216 30.4198 21.9505 29.93 22.4547ZM35.1728 27.9423C35.1728 28.6768 34.6831 29.1665 33.9486 29.1665C33.3004 29.1665 32.7243 28.5904 32.7243 27.9423V19.9917C32.7243 15.8148 29.2819 12.3725 25.1193 12.3725C20.9568 12.3725 17.5144 15.8148 17.5144 19.9917V27.9423C17.5144 28.6048 16.9383 29.1665 16.2901 29.1665C15.642 29.1665 15.0658 28.5904 15.0658 27.9423V19.9917C15.0658 14.4177 19.5597 9.90952 25.1193 9.90952C30.679 9.90952 35.1728 14.5041 35.1728 19.9917V27.9423Z"
                        fill="#E76D67"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0">
                        <rect width="150" height="49" fill="white"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                </Box>
              </Anchor>
              <Box flex={"grow"}> </Box>
              <Anchor href={"https://cis-india.org/"} target={"_blank"}>
                <Box height={"4em"}>
                  <Image
                    fit={"contain"}
                    alignSelf={"start"}
                    src={
                      "https://cis-india.org/++theme++cisindia.theme/images/logo.png"
                    }
                  />
                </Box>
              </Anchor>
            </Box>
            <Text size={"xsmall"}>
              Built by{" "}
              <Anchor href={"https://cis-india.org/"} target={"_blank"}>
                CIS
              </Anchor>{" "}
              and{" "}
              <Anchor href={"https://tattle.co.in"} target={"_blank"}>
                Tattle
              </Anchor>{" "}
              with support from{" "}
              <Anchor href={"https://www.omidyarnetwork.in/"} target={"_blank"}>
                ONI
              </Anchor>
            </Text>
          </Footer>
        </Box>
      </Keyboard>
    </Grommet>
  );
}

export const query = graphql`
  query ($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
`;
