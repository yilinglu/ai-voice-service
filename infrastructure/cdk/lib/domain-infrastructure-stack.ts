import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DomainInfrastructureStackProps extends cdk.StackProps {
  domainName: string;
  subdomains: string[];
}

export class DomainInfrastructureStack extends cdk.Stack {
  public readonly apexHostedZone: route53.IHostedZone;
  public readonly subdomainHostedZones: { [key: string]: route53.IHostedZone };
  public readonly certificates: { [key: string]: acm.ICertificate };
  public readonly dnssecKeys: { [key: string]: kms.Key };

  constructor(scope: Construct, id: string, props: DomainInfrastructureStackProps) {
    super(scope, id, props);

    const { domainName, subdomains } = props;

    // Import existing apex hosted zone
    this.apexHostedZone = route53.HostedZone.fromLookup(this, 'ApexHostedZone', {
      domainName: domainName,
    });

    // Initialize collections
    this.subdomainHostedZones = {};
    this.certificates = {};
    this.dnssecKeys = {};

    // Create KMS key for apex domain DNSSEC
    this.dnssecKeys['apex'] = this.createKmsKeyForDnssec('apex');

    // Enable DNSSEC for the apex domain
    new route53.CfnKeySigningKey(this, 'DNSSECKeySigningKeyApex', {
      hostedZoneId: this.apexHostedZone.hostedZoneId,
      keyManagementServiceArn: this.dnssecKeys['apex'].keyArn,
      name: 'plutus_dnssec_key_apex',
      status: 'ACTIVE',
    });

    // Create separate hosted zones for each subdomain
    subdomains.forEach(subdomain => {
      const fullDomain = `${subdomain}.${domainName}`;
      
      // Create hosted zone for subdomain
      this.subdomainHostedZones[subdomain] = new route53.HostedZone(this, `HostedZone${subdomain}`, {
        zoneName: fullDomain,
        comment: `Hosted zone for ${fullDomain}`,
      });

      // Create KMS key for subdomain DNSSEC
      this.dnssecKeys[subdomain] = this.createKmsKeyForDnssec(subdomain);

      // Create Key Signing Key for subdomain
      new route53.CfnKeySigningKey(this, `DNSSECKeySigningKey${subdomain}`, {
        hostedZoneId: this.subdomainHostedZones[subdomain].hostedZoneId,
        keyManagementServiceArn: this.dnssecKeys[subdomain].keyArn,
        name: `plutus_dnssec_key_${subdomain}`,
        status: 'ACTIVE',
      });

      // Create SSL certificate for subdomain
      this.certificates[subdomain] = new acm.Certificate(this, `Certificate${subdomain}`, {
        domainName: fullDomain,
        validation: acm.CertificateValidation.fromDns(this.subdomainHostedZones[subdomain]),
      });

      // Create NS record in apex zone to delegate to subdomain zone
      new route53.NsRecord(this, `NSRecord${subdomain}`, {
        zone: this.apexHostedZone,
        recordName: subdomain,
        values: this.subdomainHostedZones[subdomain].hostedZoneNameServers!,
      });
    });

    // Outputs
    new cdk.CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'Apex domain name',
      exportName: `plutus-domain-name`,
    });

    new cdk.CfnOutput(this, 'ApexHostedZoneId', {
      value: this.apexHostedZone.hostedZoneId,
      description: 'Route53 apex hosted zone ID',
      exportName: `plutus-apex-hosted-zone-id`,
    });

    new cdk.CfnOutput(this, 'ApexDNSSECStatus', {
      value: 'KSK_CREATED_PENDING_ACTIVATION',
      description: 'DNSSEC Key Signing Key created for apex domain, needs to be activated before enabling DNSSEC',
      exportName: `plutus-apex-dnssec-status`,
    });

    new cdk.CfnOutput(this, 'ApexDNSSECKeyArn', {
      value: this.dnssecKeys['apex'].keyArn,
      description: 'KMS key ARN used for apex domain DNSSEC signing',
      exportName: `plutus-apex-dnssec-key-arn`,
    });

    // Output subdomain hosted zone IDs and certificate ARNs
    subdomains.forEach(subdomain => {
      new cdk.CfnOutput(this, `HostedZoneId${subdomain}`, {
        value: this.subdomainHostedZones[subdomain].hostedZoneId,
        description: `Route53 hosted zone ID for ${subdomain}.${domainName}`,
        exportName: `plutus-hosted-zone-id-${subdomain}`,
      });

      new cdk.CfnOutput(this, `DNSSECStatus${subdomain}`, {
        value: 'KSK_CREATED_PENDING_ACTIVATION',
        description: `DNSSEC Key Signing Key created for ${subdomain}.${domainName}, needs to be activated before enabling DNSSEC`,
        exportName: `plutus-dnssec-status-${subdomain}`,
      });

      new cdk.CfnOutput(this, `DNSSECKeyArn${subdomain}`, {
        value: this.dnssecKeys[subdomain].keyArn,
        description: `KMS key ARN used for ${subdomain}.${domainName} DNSSEC signing`,
        exportName: `plutus-dnssec-key-arn-${subdomain}`,
      });

      new cdk.CfnOutput(this, `CertificateArn${subdomain}`, {
        value: this.certificates[subdomain].certificateArn,
        description: `SSL certificate ARN for ${subdomain}.${domainName}`,
        exportName: `plutus-certificate-arn-${subdomain}`,
      });
    });
  }

  private createKmsKeyForDnssec(domainType: string): kms.Key {
    return new kms.Key(this, `DNSSECKey${domainType}`, {
      description: `KMS key for DNSSEC signing - ${domainType}`,
      keyUsage: kms.KeyUsage.SIGN_VERIFY,
      keySpec: kms.KeySpec.ECC_NIST_P256,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [
              new iam.ServicePrincipal('dnssec-route53.amazonaws.com'),
            ],
            actions: [
              'kms:DescribeKey',
              'kms:GetPublicKey',
              'kms:Sign',
            ],
            resources: ['*'],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [
              new iam.AccountRootPrincipal(),
            ],
            actions: [
              'kms:*',
            ],
            resources: ['*'],
          }),
        ],
      }),
    });
  }

  private enableDnssecSigning(hostedZone: route53.IHostedZone, kmsKey: kms.Key, type: string): void {
    // Create DNSSEC signing configuration
    new route53.CfnDNSSEC(this, `DNSSECSigningConfig${type}`, {
      hostedZoneId: hostedZone.hostedZoneId,
    });
  }
} 