import { BigNumber } from '@0xproject/utils';
import BN = require('bn.js');
import ethUtil = require('ethereumjs-util');
import * as _ from 'lodash';

import { AssetProxyId, ERC20AssetData, ERC721AssetData, AssetData } from './types';

export const assetProxyUtils = {
    encodeAssetProxyId(assetProxyId: AssetProxyId): Buffer {
        return ethUtil.toBuffer(assetProxyId);
    },
    decodeAssetProxyId(encodedAssetProxyId: Buffer): AssetProxyId {
        return ethUtil.bufferToInt(encodedAssetProxyId);
    },
    encodeAddress(address: string): Buffer {
        if (!ethUtil.isValidAddress(address)) {
            throw new Error(`Invalid Address: ${address}`);
        }
        const encodedAddress = ethUtil.toBuffer(address);
        return encodedAddress;
    },
    decodeAddress(encodedAddress: Buffer): string {
        const address = ethUtil.bufferToHex(encodedAddress);
        if (!ethUtil.isValidAddress(address)) {
            throw new Error(`Invalid Address: ${address}`);
        }
        return address;
    },
    encodeUint256(value: BigNumber): Buffer {
        const formattedValue = new BN(value.toString(10));
        const encodedValue = ethUtil.toBuffer(formattedValue);
        const paddedValue = ethUtil.setLengthLeft(encodedValue, 32);
        return paddedValue;
    },
    decodeUint256(encodedValue: Buffer): BigNumber {
        const formattedValue = ethUtil.bufferToHex(encodedValue);
        const value = new BigNumber(formattedValue, 16);
        return value;
    },
    encodeERC20AssetData(tokenAddress: string): string {
        const encodedAssetProxyId = assetProxyUtils.encodeAssetProxyId(AssetProxyId.ERC20);
        const encodedAddress = assetProxyUtils.encodeAddress(tokenAddress);
        const encodedMetadata = Buffer.concat([encodedAssetProxyId, encodedAddress]);
        const encodedMetadataHex = ethUtil.bufferToHex(encodedMetadata);
        return encodedMetadataHex;
    },
    decodeERC20AssetData(assetData: string): ERC20AssetData {
        const encodedAssetData = ethUtil.toBuffer(assetData);
        if (encodedAssetData.byteLength !== 21) {
            throw new Error(
                `Could not decode ERC20 Proxy Data. Expected length of encoded data to be 21. Got ${
                    encodedAssetData.byteLength
                }`,
            );
        }
        const encodedAssetProxyId = encodedAssetData.slice(0, 1);
        const assetProxyId = assetProxyUtils.decodeAssetProxyId(encodedAssetProxyId);
        if (assetProxyId !== AssetProxyId.ERC20) {
            throw new Error(
                `Could not decode ERC20 Proxy Data. Expected Asset Proxy Id to be ERC20 (${
                    AssetProxyId.ERC20
                }), but got ${assetProxyId}`,
            );
        }
        const encodedTokenAddress = encodedAssetData.slice(1, 21);
        const tokenAddress = assetProxyUtils.decodeAddress(encodedTokenAddress);
        const erc20AssetData = {
            assetProxyId,
            tokenAddress,
        };
        return erc20AssetData;
    },
    encodeERC721AssetData(tokenAddress: string, tokenId: BigNumber, data?: string): string {
        const encodedAssetProxyId = assetProxyUtils.encodeAssetProxyId(AssetProxyId.ERC721);
        const encodedAddress = assetProxyUtils.encodeAddress(tokenAddress);
        const encodedTokenId = assetProxyUtils.encodeUint256(tokenId);
        let encodedMetadata = Buffer.concat([encodedAssetProxyId, encodedAddress, encodedTokenId]);
        if (!_.isUndefined(data)) {
            const encodedData = ethUtil.toBuffer(data);
            const dataLength = new BigNumber(encodedData.byteLength);
            const encodedDataLength = assetProxyUtils.encodeUint256(dataLength);
            encodedMetadata = Buffer.concat([encodedMetadata, encodedDataLength, encodedData]);
        }
        const encodedMetadataHex = ethUtil.bufferToHex(encodedMetadata);
        return encodedMetadataHex;
    },
    decodeERC721AssetData(assetData: string): ERC721AssetData {
        const encodedAssetData = ethUtil.toBuffer(assetData);
        if (encodedAssetData.byteLength < 53) {
            throw new Error(
                `Could not decode ERC20 Proxy Data. Expected length of encoded data to be at least 53. Got ${
                    encodedAssetData.byteLength
                }`,
            );
        }
        const encodedAssetProxyId = encodedAssetData.slice(0, 1);
        const assetProxyId = assetProxyUtils.decodeAssetProxyId(encodedAssetProxyId);
        if (assetProxyId !== AssetProxyId.ERC721) {
            throw new Error(
                `Could not decode ERC721 Proxy Data. Expected Asset Proxy Id to be ERC721 (${
                    AssetProxyId.ERC721
                }), but got ${assetProxyId}`,
            );
        }
        const encodedTokenAddress = encodedAssetData.slice(1, 21);
        const tokenAddress = assetProxyUtils.decodeAddress(encodedTokenAddress);
        const encodedTokenId = encodedAssetData.slice(21, 53);
        const tokenId = assetProxyUtils.decodeUint256(encodedTokenId);
        const nullData = '0x';
        let data = nullData;
        if (encodedAssetData.byteLength > 53) {
            const encodedDataLength = encodedAssetData.slice(53, 85);
            const dataLength = assetProxyUtils.decodeUint256(encodedDataLength);
            const expectedDataLength = new BigNumber(encodedAssetData.byteLength - 85);
            if (!dataLength.equals(expectedDataLength)) {
                throw new Error(
                    `Data length (${dataLength}) does not match actual length of data (${expectedDataLength})`,
                );
            }
            const encodedData = encodedAssetData.slice(85);
            data = ethUtil.bufferToHex(encodedData);
        }
        const erc721AssetData: ERC721AssetData = {
            assetProxyId,
            tokenAddress,
            tokenId,
            data,
        };
        return erc721AssetData;
    },
    decodeAssetDataId(assetData: string): AssetProxyId {
        const encodedAssetData = ethUtil.toBuffer(assetData);
        if (encodedAssetData.byteLength < 1) {
            throw new Error(
                `Could not decode Proxy Data. Expected length of encoded data to be at least 1. Got ${
                    encodedAssetData.byteLength
                }`,
            );
        }
        const encodedAssetProxyId = encodedAssetData.slice(0, 1);
        const assetProxyId = assetProxyUtils.decodeAssetProxyId(encodedAssetProxyId);
        return assetProxyId;
    },
    decodeAssetData(assetData: string): AssetData {
        const assetProxyId = assetProxyUtils.decodeAssetDataId(assetData);
        switch (assetProxyId) {
            case AssetProxyId.ERC20:
                const erc20AssetData = assetProxyUtils.decodeERC20AssetData(assetData);
                const generalizedERC20AssetData = {
                    assetProxyId,
                    tokenAddress: erc20AssetData.tokenAddress,
                };
                return generalizedERC20AssetData;
            case AssetProxyId.ERC721:
                const erc721AssetData = assetProxyUtils.decodeERC721AssetData(assetData);
                const generaliedERC721AssetData = {
                    assetProxyId,
                    tokenAddress: erc721AssetData.tokenAddress,
                    data: erc721AssetData.tokenId,
                };
                return generaliedERC721AssetData;
            default:
                throw new Error(`Unrecognized asset proxy id: ${assetProxyId}`);
        }
    },
};
