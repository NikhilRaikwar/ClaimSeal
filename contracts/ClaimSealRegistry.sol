// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClaimSealRegistry
/// @notice Public, read-only evidence registry for issuer-signed campaign manifests.
/// @dev The contract never transfers tokens, executes claims, or evaluates whether a website is safe.
contract ClaimSealRegistry {
    uint256 public constant MAX_MANIFEST_BYTES = 4096;

    struct CampaignRecord {
        address issuer;
        bytes32 manifestHash;
        uint64 validFrom;
        uint64 validUntil;
        uint64 revision;
        bool revoked;
        string manifestJson;
    }

    mapping(bytes32 campaignId => CampaignRecord) private campaigns;

    event ManifestPublished(
        bytes32 indexed campaignId,
        address indexed issuer,
        bytes32 manifestHash,
        uint64 validFrom,
        uint64 validUntil,
        uint64 revision
    );

    event ManifestRevoked(bytes32 indexed campaignId, address indexed issuer, uint64 revision);

    error EmptyCampaignId();
    error InvalidValidityWindow();
    error ManifestTooLarge();
    error ManifestHashMismatch();
    error UnauthorizedIssuer();
    error InvalidRevision();
    error CampaignNotFound();
    error CampaignAlreadyRevoked();

    /// @notice Creates a campaign record or replaces it with the issuer's next revision.
    /// @param campaignId Deterministic ID included in the issuer's EIP-712 manifest.
    /// @param manifestHash Keccak256 hash of the exact canonical JSON stored in `manifestJson`.
    /// @param manifestJson Full signed manifest. Storing it on-chain makes the verifier database-free.
    function publish(
        bytes32 campaignId,
        bytes32 manifestHash,
        string calldata manifestJson,
        uint64 validFrom,
        uint64 validUntil,
        uint64 revision
    ) external {
        if (campaignId == bytes32(0)) revert EmptyCampaignId();
        if (validUntil <= validFrom) revert InvalidValidityWindow();
        if (bytes(manifestJson).length == 0 || bytes(manifestJson).length > MAX_MANIFEST_BYTES) {
            revert ManifestTooLarge();
        }
        if (keccak256(bytes(manifestJson)) != manifestHash) revert ManifestHashMismatch();

        CampaignRecord storage record = campaigns[campaignId];
        if (record.issuer == address(0)) {
            if (revision != 1) revert InvalidRevision();
        } else {
            if (record.issuer != msg.sender) revert UnauthorizedIssuer();
            if (revision != record.revision + 1) revert InvalidRevision();
        }

        record.issuer = msg.sender;
        record.manifestHash = manifestHash;
        record.validFrom = validFrom;
        record.validUntil = validUntil;
        record.revision = revision;
        record.revoked = false;
        record.manifestJson = manifestJson;

        emit ManifestPublished(campaignId, msg.sender, manifestHash, validFrom, validUntil, revision);
    }

    /// @notice Permanently marks the current campaign record as revoked.
    function revoke(bytes32 campaignId) external {
        CampaignRecord storage record = campaigns[campaignId];
        if (record.issuer == address(0)) revert CampaignNotFound();
        if (record.issuer != msg.sender) revert UnauthorizedIssuer();
        if (record.revoked) revert CampaignAlreadyRevoked();

        record.revoked = true;
        emit ManifestRevoked(campaignId, msg.sender, record.revision);
    }

    function getCampaign(bytes32 campaignId)
        external
        view
        returns (
            address issuer,
            bytes32 manifestHash,
            uint64 validFrom,
            uint64 validUntil,
            uint64 revision,
            bool revoked
        )
    {
        CampaignRecord storage record = campaigns[campaignId];
        return (
            record.issuer,
            record.manifestHash,
            record.validFrom,
            record.validUntil,
            record.revision,
            record.revoked
        );
    }

    function getManifest(bytes32 campaignId) external view returns (string memory) {
        return campaigns[campaignId].manifestJson;
    }
}
