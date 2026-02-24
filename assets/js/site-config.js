(function () {
  "use strict";

  /**
   * @typedef {Object} SiteConfig
   * @property {string} businessName
   * @property {string} phoneDisplay
   * @property {string} phoneE164
   * @property {string} email
   * @property {string} instagramUrl
   * @property {string} googleReviewsUrl
   * @property {string} postcode
   * @property {string} responseWindowText
   * @property {string} legalDisclosure
   * @property {string} coreCoverageLabel
   * @property {string} surroundingCoverageLabel
   */

  /**
   * @typedef {Object} ReviewSnippet
   * @property {string} reviewer
   * @property {"Google"} source
   * @property {number} rating
   * @property {string} quote
   */

  /** @type {SiteConfig} */
  var siteConfig = {
    businessName: "SK Motors",
    phoneDisplay: "+44 7873 829056",
    phoneE164: "447873829056",
    email: "skmotorservices.uk@gmail.com",
    instagramUrl: "https://instagram.com/skmotorservices",
    googleReviewsUrl: "https://www.google.com/search?sca_esv=e8cd867175193f88&sxsrf=ANbL-n4IErHl3_0QuHm6vzhPV8EHkqexqQ:1771744439544&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOcUfKlZ6aNneJhPQWEXPXItOtehgXoJBknTtc8aaO1k6QfgojDG_60-AlRTkLy0JAD2er_x_CTyDebp3NDyEEpqMq4FQZn0A49i5jNJb29vJjdn3qQ%3D%3D&q=SK+MOTOR+SERVICES+UK+Reviews&sa=X&ved=2ahUKEwj-tc6vxuySAxX7OPsDHQqEML4Q0bkNegQIORAD&biw=1920&bih=919&dpr=1",
    postcode: "SW11 3GU",
    responseWindowText: "24-hour contact, usually responds within 12 hours.",
    legalDisclosure: "SK Motors is a trading name for PEAK TIME SOLUTIONS LTD (16183305).",
    coreCoverageLabel: "Primary Coverage: South West London Area.",
    surroundingCoverageLabel: "Surrounding Areas Coverage: CR, SM, KT, SE, TW, and BR Postcodes (subject to availability)."
  };

  /** @type {ReviewSnippet[]} */
  var reviewSnippets = [
    {
      reviewer: "M. Kay",
      source: "Google",
      rating: 5,
      quote: "Great service. The mechanic knows what he is doing. Very dedicated, and my car was serviced with spark plugs replaced in reasonable time."
    },
    {
      reviewer: "Jawad A.",
      source: "Google",
      rating: 5,
      quote: "Reliable, quality work, and above everything an honest guy."
    },
    {
      reviewer: "Toheed L.",
      source: "Google",
      rating: 5,
      quote: "Very professional and reliable service."
    },
    {
      reviewer: "Almaz G.",
      source: "Google",
      rating: 5,
      quote: "Very friendly, helpful, and excellent quality of service."
    },
    {
      reviewer: "Mohammed A.",
      source: "Google",
      rating: 5,
      quote: "Excellent and reliable service."
    },
    {
      reviewer: "Hamayou Y.",
      source: "Google",
      rating: 5,
      quote: "This is the second time I have used SK Motors, and it is five stars all the way."
    }
  ];

  window.siteConfig = siteConfig;
  window.reviewSnippets = reviewSnippets;
})();
