import { formatCallResults, getFieldMask, getErrorLocationPath } from "./utils";

test("proto object result is parsed from field mask", () => {
  const fakeResponse = [
    {
      campaign: {
        resourceName: "customers/123/campaigns/123",
        id: { value: 123 },
        targetCpa: undefined,
        name: { value: "2019" },
        status: 0,
        urlCustomParametersList: [],
        manualCpc: undefined,
        manualCpv: undefined,
      },
      metrics: {
        cost: { value: 100 },
        clicks: undefined,
      },
    },
  ];
  const fieldMask = {
    pathsList: ["campaign.id", "campaign.name", "campaign.url_custom_parameters", "metrics.cost"],
  };
  const parsedResults = formatCallResults(fakeResponse, fieldMask);

  expect(parsedResults).toStrictEqual([
    {
      campaign: {
        resourceName: "customers/123/campaigns/123",
        id: 123,
        name: "2019",
        urlCustomParameters: [],
      },
      metrics: {
        cost: 100,
      },
    },
  ]);
  expect(Object.keys(parsedResults[0].campaign)[0]).toEqual("resourceName");
});

test("proto object result can be parsed for deeply nested entities", () => {
  const fieldMask = {
    pathsList: [
      "campaign.id",
      "campaign.name",
      "ad_group.id",
      "ad_group.name",
      "ad_group_criterion.criterion_id",
      "ad_group_criterion.keyword.text",
      "ad_group_criterion.keyword.match_type",
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
    ],
  };
  const parsedResults = formatCallResults(JSON.parse(fakeKeywordResponse), fieldMask);

  expect(parsedResults).toEqual([
    {
      campaign: {
        resourceName: "customers/9262111890/campaigns/1473765780",
        id: 1473765780,
        name: "test-campaign-2 (created during library test)",
      },
      adGroup: {
        resourceName: "customers/9262111890/adGroups/59960230227",
        id: 59960230227,
        name: "new name",
      },
      adGroupCriterion: {
        resourceName: "customers/9262111890/adGroupCriteria/59960230227_10234981",
        criterionId: 10234981,
        keyword: {
          text: "hello",
          matchType: 4,
        },
      },
      metrics: {
        clicks: 0,
        costMicros: 0,
        impressions: 0,
      },
    },
    {
      campaign: {
        resourceName: "customers/9262111890/campaigns/1485014801",
        id: 1485014801,
        name: "Test Campaign - DO NOT REMOVE",
      },
      adGroup: {
        resourceName: "customers/9262111890/adGroups/60170225920",
        id: 60170225920,
        name: "Test AdGroup (Keywords) - DO NOT REMOVE",
      },
      adGroupCriterion: {
        resourceName: "customers/9262111890/adGroupCriteria/60170225920_480628692166",
        criterionId: 480628692166,
        keyword: {
          text: "test-keyword-4",
          matchType: 4,
        },
      },
      metrics: {
        clicks: 0,
        costMicros: 0,
        impressions: 0,
      },
    },
  ]);
});

test("proto object result can be parsed for nested entities with arrays", async () => {
  const fieldMask = {
    pathsList: [
      "ad_group_ad.ad.final_urls",
      "ad_group.targeting_setting.target_restrictions",
      "ad_group.name",
    ],
  };

  const parsedResultsWithFieldMask = formatCallResults(fakeAdGroupResponse, fieldMask);
  const parsedResultsWithoutFieldMask = formatCallResults(fakeAdGroupResponse, undefined);

  const expected_with_field_mask = [
    {
      adGroupAd: {
        resourceName: "customers/3827277046/adGroupAds/37706041185~170102539400",
        ad: {
          finalUrls: ["http://opteo.co/lp/ad-words-tool"],

          // Note that these will have been removed by the field mask.
          // someDirectArray: [3, 4, 5],
          // finalAppUrls: [],
        },
      },
      adGroup: {
        resourceName: "customers/3827277046/adGroups/37706041185",
        targetingSetting: {
          targetRestrictions: [
            { targetingDimension: 3, bidOnly: false },
            { targetingDimension: 4, bidOnly: false },
            { targetingDimension: 5, bidOnly: true },
            { targetingDimension: 6, bidOnly: true },
            { targetingDimension: 7, bidOnly: false },
            { targetingDimension: 8, bidOnly: false },
          ],
        },
        name: "ad words tool [MB]",
        // Note that this will have been removed by the field mask.
        // status: 0,
      },
    },
  ];

  const expected_without_field_mask = [
    {
      adGroupAd: {
        resourceName: "customers/3827277046/adGroupAds/37706041185~170102539400",
        ad: {
          finalUrls: ["http://opteo.co/lp/ad-words-tool"],
          someDirectArray: [3, 4, 5],
          // Note that have been returned even through it is empty.
          finalAppUrls: [],
        },
      },
      adGroup: {
        resourceName: "customers/3827277046/adGroups/37706041185",
        targetingSetting: {
          targetRestrictions: [
            { targetingDimension: 3, bidOnly: false },
            { targetingDimension: 4, bidOnly: false },
            { targetingDimension: 5, bidOnly: true },
            { targetingDimension: 6, bidOnly: true },
            { targetingDimension: 7, bidOnly: false },
            { targetingDimension: 8, bidOnly: false },
          ],
        },
        name: "ad words tool [MB]",
        // Note that `status` will be returned by the parsing function even through it is of the "UNSPECIFIED" enum type.
        status: 0,
      },
    },
  ];

  expect(parsedResultsWithFieldMask).toEqual(expected_with_field_mask);
  expect(parsedResultsWithoutFieldMask).toEqual(expected_without_field_mask);
});

test("proto object result can be parsed when fieldmask ends in unspecified object", () => {
  // This can happen for fields such as ad_group_ad.policy_summary, which returns an object.
  // It is not possible to select individual fields of this object -- the whole object is always returned.

  const fieldMask = {
    pathsList: ["ad_group_ad.policy_summary"],
  };

  const parsedResultsWithFieldMask = formatCallResults(fakeAdGroupAdResponse, fieldMask);
  const parsedResultsWithoutFieldMask = formatCallResults(fakeAdGroupAdResponse, undefined);

  const expected = [
    {
      adGroupAd: {
        resourceName: "customers/3827277046/adGroupAds/37706041185~170102539400",
        policySummary: {
          approvalStatus: 0,
          policyTopicEntries: [],
          reviewStatus: 2,
        },
      },
    },
  ];

  expect(parsedResultsWithFieldMask).toEqual(expected);
  expect(parsedResultsWithoutFieldMask).toEqual(expected);
});

test("proto object result can be parsed when field mask is not present", () => {
  const parsedResults = formatCallResults([JSON.parse(fakeCampaignResponse)], undefined);

  expect(parsedResults).toEqual([
    {
      resourceName: "customers/9262111890/campaigns/1485014801",
      id: 1485014801,
      name: "Test Campaign - DO NOT REMOVE",
      status: 2,
      servingStatus: 2,
      adServingOptimizationStatus: 2,
      advertisingChannelType: 2,
      advertisingChannelSubType: 0,
      urlCustomParameters: [],
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: true,
        targetPartnerSearchNetwork: false,
      },
      geoTargetTypeSetting: {
        positiveGeoTargetType: 2,
        negativeGeoTargetType: 2,
      },
      campaignBudget: "customers/9262111890/campaignBudgets/1548344372",
      biddingStrategyType: 9,
      startDate: "2018-07-24",
      endDate: "2037-12-30",
      frequencyCaps: [],
      videoBrandSafetySuitability: 0,
      selectiveOptimization: {
        conversionActions: [],
      },
      targetSpend: {
        cpcBidCeilingMicros: 1000000,
      },
    },
  ]);
});

test("parsing results with field mask correctly removes undefined properties", () => {
  // Sometimes, the api will not return a field at all if it is unset on the google servers.
  // We need to make sure we follow that behavior by not returning that field.

  const fieldMask = {
    // Asking for a name that will not be returned in API response
    pathsList: ["ad_group_ad.name", "ad_group_ad.policy_summary"],
  };

  const parsedResultsWithFieldMask = formatCallResults(fakeAdGroupAdResponse, fieldMask);

  // We should not have 'name' in the parsed result
  expect(Object.keys(parsedResultsWithFieldMask[0].adGroupAd).includes("name")).toBeFalsy();
});

test("parsing results with no field mask correctly removes undefined properties", () => {
  const result = [
    {
      resourceName: "customers/9262111890/campaigns/1485014801",
      id: {
        value: 1485014801,
      },
      name: {
        value: "Test Campaign - DO NOT REMOVE",
      },
      trackingUrlTemplate: undefined,
      status: 2,
    },
  ];

  const parsedResult = formatCallResults(result, undefined);

  expect(parsedResult[0]).toEqual({
    resourceName: "customers/9262111890/campaigns/1485014801",
    id: 1485014801,
    name: "Test Campaign - DO NOT REMOVE",
    status: 2,
  });
});

test("parsing removes the append list postfix to array types", () => {
  const result = [
    {
      resourceName: "customers/9262111890/campaigns/1485014801",
      urlCustomParametersList: [],
      frequencyCapsList: [],
    },
  ];

  const parsedResult = formatCallResults(result, undefined);

  expect(parsedResult[0]).toEqual({
    resourceName: "customers/9262111890/campaigns/1485014801",
    urlCustomParameters: [],
    frequencyCaps: [],
  });
});

test("parsing removes undefined properties even if they're defined in the field mask", () => {
  const result = [
    {
      campaign: {
        resourceName: "customers/9262111890/campaigns/1485014801",
        id: 123,
        finalUrlSuffix: undefined,
        dynamicSearchSettings: undefined,
        searchSettings: {
          one: "one",
          two: undefined,
        },
      },
    },
  ];

  const parsedResult = formatCallResults(result, {
    pathsList: [
      "campaign.resource_name",
      "campaign.id",
      "campaign.final_url_suffix",
      "campaign.dynamic_search_settings",
      "campaign.search_settings.one",
      "campaign.search_settings.two",
    ],
  });

  expect(parsedResult[0]).toEqual({
    campaign: {
      resourceName: "customers/9262111890/campaigns/1485014801",
      id: 123,
      searchSettings: {
        one: "one",
      },
    },
  });
});

test("update mask can be generated from a resource object", () => {
  const resource = {
    resource_name: "customers/123/campaignBudgets/321",
    amount_micros: 20000,
    status: 2,
    settings: {
      another_setting: {
        something: "value",
      },
    },
    some_list: ["foo", "bar", "baz"],
  };
  const mask = getFieldMask(resource);
  expect(mask.toObject().pathsList).toEqual([
    "amount_micros",
    "status",
    "settings.another_setting.something",
    "some_list",
  ]);
});

test("field location error can be generated from errors list object", () => {
  const fieldError = {
    fieldPathElementsList: [
      { fieldName: "operations", index: { value: 0 } },
      { fieldName: "create" },
      { fieldName: "ad" },
      { fieldName: "display_url" },
    ],
  };
  const badFieldError = { fieldPathBad: "invalid" };
  const emptyFieldError = { fieldPathElementsList: [] };

  const path = getErrorLocationPath(fieldError);
  const badPath = getErrorLocationPath(badFieldError);
  const emptyPath = getErrorLocationPath(emptyFieldError);

  expect(path).toEqual("operations[0].create.ad.display_url");
  expect(badPath).toEqual("");
  expect(emptyPath).toEqual("");
  expect(getErrorLocationPath(undefined)).toEqual("");
});

const fakeCampaignResponse = `
  {
   "resourceName": "customers/9262111890/campaigns/1485014801",
   "id": {
     "value": 1485014801
   },
   "name": {
     "value": "Test Campaign - DO NOT REMOVE"
   },
   "status": 2,
   "servingStatus": 2,
   "adServingOptimizationStatus": 2,
   "advertisingChannelType": 2,
   "advertisingChannelSubType": 0,
   "urlCustomParametersList": [],
   "networkSettings": {
     "targetGoogleSearch": {
       "value": true
     },
     "targetSearchNetwork": {
       "value": true
     },
     "targetContentNetwork": {
       "value": true
     },
     "targetPartnerSearchNetwork": {
       "value": false
     }
   },
   "geoTargetTypeSetting": {
     "positiveGeoTargetType": 2,
     "negativeGeoTargetType": 2
   },
   "campaignBudget": {
     "value": "customers/9262111890/campaignBudgets/1548344372"
   },
   "biddingStrategyType": 9,
   "startDate": {
     "value": "2018-07-24"
   },
   "endDate": {
     "value": "2037-12-30"
   },
   "frequencyCapsList": [],
   "videoBrandSafetySuitability": 0,
   "selectiveOptimization": {
     "conversionActionsList": []
   },
   "targetSpend": {
     "cpcBidCeilingMicros": {
       "value": 1000000
     }
   }
  }
`;

const fakeKeywordResponse = `
  [
    {
      "adGroup": {
        "resourceName": "customers/9262111890/adGroups/59960230227",
        "id": {
          "value": 59960230227
        },
        "name": {
          "value": "new name"
        },
        "status": 0,
        "type": 0,
        "adRotationMode": 0,
        "urlCustomParametersList": [],
        "displayCustomBidDimension": 0,
        "effectiveTargetCpaSource": 0,
        "effectiveTargetRoasSource": 0
      },
      "adGroupCriterion": {
        "resourceName": "customers/9262111890/adGroupCriteria/59960230227_10234981",
        "criterionId": {
          "value": 10234981
        },
        "status": 0,
        "type": 0,
        "effectiveCpcBidSource": 0,
        "effectiveCpmBidSource": 0,
        "effectiveCpvBidSource": 0,
        "effectivePercentCpcBidSource": 0,
        "finalUrlsList": [],
        "urlCustomParametersList": [],
        "keyword": {
          "text": {
            "value": "hello"
          },
          "matchType": 4
        }
      },
      "campaign": {
        "resourceName": "customers/9262111890/campaigns/1473765780",
        "id": {
          "value": 1473765780
        },
        "name": {
          "value": "test-campaign-2 (created during library test)"
        },
        "status": 0,
        "servingStatus": 0,
        "adServingOptimizationStatus": 0,
        "advertisingChannelType": 0,
        "advertisingChannelSubType": 0,
        "urlCustomParametersList": [],
        "biddingStrategyType": 0,
        "frequencyCapsList": [],
        "videoBrandSafetySuitability": 0
      },
      "keywordView": {
        "resourceName": "customers/9262111890/keywordViews/59960230227_10234981"
      },
      "metrics": {
        "clicks": {
          "value": 0
        },
        "costMicros": {
          "value": 0
        },
        "historicalCreativeQualityScore": 0,
        "historicalLandingPageQualityScore": 0,
        "historicalSearchPredictedCtr": 0,
        "impressions": {
          "value": 0
        },
        "interactionEventTypesList": []
      }
    },
    {
      "adGroup": {
        "resourceName": "customers/9262111890/adGroups/60170225920",
        "id": {
          "value": 60170225920
        },
        "name": {
          "value": "Test AdGroup (Keywords) - DO NOT REMOVE"
        },
        "status": 0,
        "type": 0,
        "adRotationMode": 0,
        "urlCustomParametersList": [],
        "displayCustomBidDimension": 0,
        "effectiveTargetCpaSource": 0,
        "effectiveTargetRoasSource": 0
      },
      "adGroupCriterion": {
        "resourceName": "customers/9262111890/adGroupCriteria/60170225920_480628692166",
        "criterionId": {
          "value": 480628692166
        },
        "status": 0,
        "type": 0,
        "effectiveCpcBidSource": 0,
        "effectiveCpmBidSource": 0,
        "effectiveCpvBidSource": 0,
        "effectivePercentCpcBidSource": 0,
        "finalUrlsList": [],
        "urlCustomParametersList": [],
        "keyword": {
          "text": {
            "value": "test-keyword-4"
          },
          "matchType": 4
        }
      },
      "campaign": {
        "resourceName": "customers/9262111890/campaigns/1485014801",
        "id": {
          "value": 1485014801
        },
        "name": {
          "value": "Test Campaign - DO NOT REMOVE"
        },
        "status": 0,
        "servingStatus": 0,
        "adServingOptimizationStatus": 0,
        "advertisingChannelType": 0,
        "advertisingChannelSubType": 0,
        "urlCustomParametersList": [],
        "biddingStrategyType": 0,
        "frequencyCapsList": [],
        "videoBrandSafetySuitability": 0
      },
      "keywordView": {
        "resourceName": "customers/9262111890/keywordViews/60170225920_480628692166"
      },
      "metrics": {
        "clicks": {
          "value": 0
        },
        "costMicros": {
          "value": 0
        },
        "historicalCreativeQualityScore": 0,
        "historicalLandingPageQualityScore": 0,
        "historicalSearchPredictedCtr": 0,
        "impressions": {
          "value": 0
        },
        "interactionEventTypesList": []
      }
    }
  ]`;

const fakeAdGroupResponse = [
  {
    accountBudget: undefined,
    accountBudgetProposal: undefined,
    adGroup: {
      resourceName: "customers/3827277046/adGroups/37706041185",
      id: undefined,
      name: { value: "ad words tool [MB]" },
      status: 0,
      finalUrlSuffix: undefined,
      targetingSetting: {
        targetRestrictionsList: [
          { targetingDimension: 3, bidOnly: { value: false } },
          { targetingDimension: 4, bidOnly: { value: false } },
          { targetingDimension: 5, bidOnly: { value: true } },
          { targetingDimension: 6, bidOnly: { value: true } },
          { targetingDimension: 7, bidOnly: { value: false } },
          { targetingDimension: 8, bidOnly: { value: false } },
        ],
      },
      effectiveTargetCpaMicros: undefined,
      effectiveTargetRoas: undefined,
    },
    adGroupAd: {
      resourceName: "customers/3827277046/adGroupAds/37706041185~170102539400",
      adGroup: undefined,
      ad: {
        id: undefined,
        someDirectArray: [3, 4, 5],
        finalUrlsList: [{ value: "http://opteo.co/lp/ad-words-tool" }],
        finalAppUrlsList: [],
      },
    },
    adGroupAdLabel: undefined,
    adGroupAudienceView: undefined,
    adGroupBidModifier: undefined,
  },
];

const fakeAdGroupAdResponse = [
  {
    adGroupAd: {
      resourceName: "customers/3827277046/adGroupAds/37706041185~170102539400",
      adGroup: undefined,
      policySummary: { policyTopicEntriesList: [], reviewStatus: 2, approvalStatus: 0 },
    },
    adGroupAdLabel: undefined,
    adGroupAudienceView: undefined,
    adGroupBidModifier: undefined,
  },
];
