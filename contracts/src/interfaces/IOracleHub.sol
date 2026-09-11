// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IOracleHub
/// @notice Interface for DreamDEX OracleHub.
/// @dev Testnet: 0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b
interface IOracleHub {
    struct QuestionDef {
        string questionText;
        Source[] sources;
        ValidAnswers validAnswers;
        uint256 resolutionTime;
        uint256 minAgreement;
        uint256 subcommitteeSize;
        uint256 subcommitteeThreshold;
    }

    struct Source {
        uint8 sourceType;
        bytes params;
    }

    struct ValidAnswers {
        uint8 answerType;
        string[] discreteOutcomes;
        NumericInterval[] numericIntervals;
        uint64 numericDecimals;
    }

    struct NumericInterval {
        int256 low;
        int256 high;
    }

    function scheduleQuestion(QuestionDef calldata def) external payable returns (uint256 oracleQuestionId);
    function getSchedulingCost(QuestionDef calldata def) external view returns (uint256 cost);
    function pullAnswer(uint256 oracleQuestionId) external returns (uint8 outcomeIdx, bool voided);
    function pullNumericAnswer(uint256 oracleQuestionId) external returns (int256 numericValue, bool voided);
    function marketsForQuestion(uint256 oracleQuestionId) external view returns (bytes32[] memory markets);
    function bindCount(uint256 oracleQuestionId) external view returns (uint32 count);
    function getSlotCount(uint256 oracleQuestionId) external view returns (uint8 slotCount);
}
