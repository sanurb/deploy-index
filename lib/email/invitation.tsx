import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface BetterAuthInviteUserEmailProps {
  username?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
}

export const InviteUserEmail = ({
  username,
  invitedByUsername,
  invitedByEmail,
  teamName,
  teamImage,
  inviteLink,
}: BetterAuthInviteUserEmailProps) => {
  const previewText = `${invitedByUsername} invited you to join ${teamName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>

      <Tailwind>
        <Body className="mx-auto bg-[#fafafa] font-sans text-[#0f0f0f]">
          <Container className="mx-auto my-10 max-w-[480px] rounded-xl bg-white px-6 py-8">
            {/* Header */}
            <Heading className="mb-2 text-[20px] font-medium text-[#0f0f0f]">
              You’ve been invited
            </Heading>

            <Text className="mb-6 text-[14px] leading-[22px] text-[#525252]">
              <strong className="text-[#0f0f0f]">{invitedByUsername}</strong> (
              {invitedByEmail}) invited you to join{" "}
              <strong className="text-[#0f0f0f]">{teamName}</strong>.
            </Text>

            {/* Team */}
            {teamImage && (
              <Section className="mb-6">
                <Row>
                  <Column>
                    <Img
                      className="rounded-full"
                      height="40"
                      src={teamImage}
                      width="40"
                    />
                  </Column>
                </Row>
              </Section>
            )}

            {/* CTA */}
            <Section className="mb-6">
              <Button
                className="rounded-md bg-[#0f0f0f] px-4 py-2 text-[13px] font-medium text-white no-underline"
                href={inviteLink}
              >
                Join team
              </Button>
            </Section>

            {/* Fallback link */}
            <Text className="mb-6 text-[13px] leading-[20px] text-[#737373]">
              Or copy and paste this link into your browser:
              <br />
              <Link
                className="break-all text-[#0f0f0f] underline underline-offset-2"
                href={inviteLink}
              >
                {inviteLink}
              </Link>
            </Text>

            <Hr className="my-6 border-[#e5e5e5]" />

            {/* Footer */}
            <Text className="text-[12px] leading-[18px] text-[#737373]">
              This invitation was sent to{" "}
              <span className="text-[#0f0f0f]">{username}</span>. If you weren’t
              expecting this, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export function reactInvitationEmail(props: BetterAuthInviteUserEmailProps) {
  return <InviteUserEmail {...props} />;
}
