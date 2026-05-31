const imgVariantHeroiconsOutlineSize16Px = "https://www.figma.com/api/mcp/asset/7c7624f0-bcec-493a-8f26-3816ecbb3fad";
const imgVector1Stroke = "https://www.figma.com/api/mcp/asset/2614ca26-c31b-4bcb-8cbc-164dbbc63267";
const imgVector = "https://www.figma.com/api/mcp/asset/331a6a6b-5e1e-4bbf-b747-e818762428be";
const imgVector1Stroke1 = "https://www.figma.com/api/mcp/asset/9e89b519-c65a-46be-8b69-494a7612c2f7";
const imgVector1 = "https://www.figma.com/api/mcp/asset/f35a39d6-4907-4b37-a6d9-8907c3726cd4";
const imgVector2 = "https://www.figma.com/api/mcp/asset/0a0b82c9-ae37-4c1e-ae0c-8efa7ab66da2";
const imgVectorStroke = "https://www.figma.com/api/mcp/asset/c02a5908-27e9-4690-824d-684138132d94";
const imgVector3 = "https://www.figma.com/api/mcp/asset/1bfc1335-952d-40fc-8e33-3a9420986648";
const imgVectorStroke1 = "https://www.figma.com/api/mcp/asset/de454190-7429-473b-aa19-31bad4a562ff";

type AdjustmentsHorizontalProps = {
  className?: string;
  size?: "16px";
  variant?: "heroicons-outline";
};

function AdjustmentsHorizontal({ className, size = "16px", variant = "heroicons-outline" }: AdjustmentsHorizontalProps) {
  return (
    <div className={className || "relative size-[16px]"} data-node-id="1:7191">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVariantHeroiconsOutlineSize16Px} />
    </div>
  );
}

type ButtonIconSquaresProps = {
  className?: string;
  size?: "32px";
  state?: "Default";
  type?: "Open chevron";
};

function ButtonIconSquares({ className, size = "32px", state = "Default", type = "Open chevron" }: ButtonIconSquaresProps) {
  return (
    <div className={className || "content-stretch flex flex-col items-center justify-center relative rounded-[8px] size-[32px]"} data-node-id="1502:86059">
      <div className="overflow-clip relative rounded-[4px] shrink-0 size-[16px]" data-node-id="1502:86212" data-name="Chevron-up">
        <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[32.81%]" data-node-id="I1502:86212;32558:4517" data-name="Vector 1 (Stroke)">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector1Stroke} />
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveOverviewAccordion() {
  return (
    <div className="bg-white border border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-col gap-[32px] items-start p-[24px] relative rounded-[16px] size-full" data-node-id="1097:240221" data-name="Executive Overview Accordion">
      <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="1097:240222">
        <div className="content-stretch flex gap-[32px] h-[32px] items-center relative shrink-0 w-full" data-node-id="1097:240223">
          <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="1097:240224">
            <div className="bg-[#142845] content-stretch flex h-[24px] items-center justify-center px-[16px] relative rounded-[30px] shrink-0 w-[40px]" data-node-id="1097:240225" data-name="Badge & Pill - Number Badge">
              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240225;32633:5123">
                <div className="[word-break:break-word] flex flex-col font-['Inter:Medium'] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-center text-white whitespace-nowrap" data-node-id="I1097:240225;32633:5124">
                  <p className="leading-[16px]">02</p>
                </div>
              </div>
            </div>
            <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#142845] text-[18px] text-center whitespace-nowrap" data-node-id="1097:240226">
              <p className="leading-[24px]">{`Tender Returns (Revision {X}) `}</p>
            </div>
          </div>
          <ButtonIconSquares className="content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" />
        </div>
        <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-node-id="1097:240228">
          <div className="[word-break:break-word] flex flex-col font-['Inter:Light'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[#142845] text-[12px] w-[680px]" data-node-id="1097:240229">
            <p className="leading-[16px]">Procurex extracts information from Form of Tender, Cover letter, and BOQ to highlight any key issues. Other sources like 3D files or drawings are not considered at this moment.</p>
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col items-end justify-center min-w-px relative" data-node-id="1097:240230">
            <button className="bg-[#142845] content-stretch cursor-pointer flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240231" data-name="Button">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[12px] text-left text-white whitespace-nowrap" data-node-id="I1097:240231;32542:308">
                View Appendix A - Comparison Summary
              </p>
            </button>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-node-id="1097:240232">
        <div className="content-stretch flex gap-[8px] h-[32px] items-center justify-end relative shrink-0 w-[1016px]" data-node-id="1097:240233">
          <button className="border border-[#142845] border-solid content-stretch cursor-pointer flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240234" data-name="Button">
            <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240234;32544:2137" data-name="Cog-6-tooth">
              <div className="absolute inset-[12.5%_14.19%]" data-node-id="I1097:240234;32544:2137;32568:1589" data-name="Vector">
                <div className="absolute inset-[-4.17%_-4.36%]">
                  <img alt="" className="block max-w-none size-full" src={imgVector} />
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] text-left whitespace-nowrap" data-node-id="I1097:240234;32542:371">
              Variance baseline
            </p>
            <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240234;32544:2112" data-name="Chevron-down">
              <div className="absolute bottom-[32.81%] left-1/4 right-1/4 top-[37.5%]" data-node-id="I1097:240234;32544:2112;32542:12155" data-name="Vector 1 (Stroke)">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector1Stroke1} />
              </div>
            </div>
          </button>
        </div>
        <div className="content-stretch flex items-start relative shrink-0 w-[1016px]" data-node-id="1097:240236" data-name="Tender rankings table">
          <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="1097:240237" data-name="Recent Projects">
            <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative rounded-[16px]" data-node-id="1097:240238" data-name="Card-dashboard">
              <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-tl-[8px] rounded-tr-[8px] shrink-0 w-full" data-node-id="1097:240239" data-name="Table">
                <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-node-id="1097:240240">
                  <div className="content-stretch flex gap-[16px] items-center pb-[8px] pr-[8px] relative shrink-0 w-full" data-node-id="1097:240241" data-name="Activity table labels">
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[104px]" data-node-id="1097:240255" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240255;32923:28128" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1097:240255;32923:28129">
                          <p className="leading-[16px]">Tenderer</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240255;32923:33563">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240255;32923:28130" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240255;32923:28130;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[152px]" data-node-id="1097:240256" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240256;32923:28128" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1097:240256;32923:28129">
                          <p className="leading-[16px]">Original Tender Sum</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240256;32923:33563">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240256;32923:28130" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240256;32923:28130;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[152px]" data-node-id="1097:240257" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240257;32923:28128" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1097:240257;32923:28129">
                          <p className="leading-[16px]">Corrected Tender Sum</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240257;32923:33563">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240257;32923:28130" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240257;32923:28130;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="content-stretch cursor-pointer flex gap-[4px] items-center relative shrink-0 w-[136px]" data-node-id="1097:240258" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="1097:240259" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] text-left whitespace-nowrap" data-node-id="1097:240260">
                          <p className="leading-[16px]">% from baseline</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="1097:240261">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="1097:240262" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240262;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="1097:240264">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="1097:240265" data-name="Information-circle">
                          <div className="absolute inset-[12.5%]" data-node-id="I1097:240265;32562:1908" data-name="Vector">
                            <div className="absolute inset-[-4.17%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector2} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                    <button className="content-stretch cursor-pointer flex gap-[4px] items-center relative shrink-0" data-node-id="1097:240267" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="1097:240268" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] text-left whitespace-nowrap" data-node-id="1097:240269">
                          <p className="leading-[16px]">% from lowest bidder</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="1097:240270">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="1097:240271" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240271;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative" data-node-id="1097:240273" data-name="Table - Table Label">
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240273;32923:28128" data-name="text">
                        <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1097:240273;32923:28129">
                          <p className="leading-[16px]">Key issues</p>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240273;32923:33563">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240273;32923:28130" data-name="Chevron-up-down">
                          <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1097:240273;32923:28130;32568:1765" data-name="Vector">
                            <div className="absolute inset-[-0.43%_-0.83%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector1} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240274" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240275">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240276" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240278">
                        <p className="leading-[16px]">Orion Property Group</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240282">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240285">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240286">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240289">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240290">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240293" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240293;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240293;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240294">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-1,5%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240295">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240298" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240298;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240298;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240299">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-center flex flex-[1_0_0] flex-wrap gap-[8px] items-center min-w-px px-[16px] relative self-stretch" data-node-id="1097:240300">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240303" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240303;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240303;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240303;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">8</span>
                              <span className="leading-[16px]">{` High rates `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240304" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240304;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240304;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240304;33322:3879">
                            <p className="text-[12px]">
                              <span className="font-['Inter:Semi_Bold'] font-semibold leading-[16px]">{`3 `}</span>
                              <span className="font-['Inter:Regular'] font-normal leading-[16px]">{`Low rates `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240305" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240305;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240305;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240305;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">{`5 `}</span>
                              <span className="leading-[16px]">{`Unpriced `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240306" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240306;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240306;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240306;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">0</span>
                              <span className="leading-[16px]">{` Arithmetical errors `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240307" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240307;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240307;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240307;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">1</span>
                              <span className="leading-[16px]">{` Excluded/ By others / By client `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240308">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240311" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240311;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240311;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240311;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240321" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240322">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240323" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240325">
                        <p className="leading-[16px]">Stratus Infrastructure Group</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240329">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240332">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240333">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240336">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240337">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240340" data-name="Arrow-trending-up">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240340;32872:19523" data-name="heroicons-micro/arrow-trending-up">
                        <div className="absolute h-[8.496px] left-px top-[3.5px] w-[13.397px]" data-node-id="I1097:240340;32872:19523;1643:10" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke1} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240341">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">+1,2%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240342">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240345" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240345;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240345;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240346">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-center flex flex-[1_0_0] flex-wrap gap-[8px] items-center min-w-px px-[16px] relative" data-node-id="1097:240347">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240350" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240350;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240350;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240350;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">4</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` `}</span>
                              <span className="leading-[16px]">{`High rates `}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240351" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240351;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240351;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240351;33322:3879">
                            <p className="text-[12px]">
                              <span className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[16px] not-italic">7</span>
                              <span className="leading-[16px]">{` Low rates`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240352" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240352;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240352;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240352;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">3</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Unpriced</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240353" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240353;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240353;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240353;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`6 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Arithmetical errors</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240354" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240354;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240354;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240354;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">8</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Excluded/ By others / By client`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240355">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240358" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240358;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240358;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240358;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240368" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240369">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240370" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240372">
                        <p className="leading-[16px]">Helix MEP Solutions LLC</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240376">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240379">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240380">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240383">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240384">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240387" data-name="Arrow-trending-up">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240387;32872:19523" data-name="heroicons-micro/arrow-trending-up">
                        <div className="absolute h-[8.496px] left-px top-[3.5px] w-[13.397px]" data-node-id="I1097:240387;32872:19523;1643:10" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke1} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240388">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">+1,2%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240389">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240392" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240392;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240392;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240393">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start justify-center min-w-px px-[16px] relative self-stretch" data-node-id="1097:240394">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240397" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240397;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240397;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240397;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`4 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">High rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240398" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240398;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240398;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240398;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`10 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Low rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240399" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240399;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240399;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240399;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`15 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Unpriced</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240400" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240400;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240400;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240400;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">0</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Arithmetical errors`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240401" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240401;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240401;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240401;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`12 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Excluded/ By others / By client</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240402">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240405" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240405;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240405;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240405;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240415" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240416">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240417" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240419">
                        <p className="leading-[16px]">Linea Interiors Group</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240423">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240426">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240427">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240430">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240431">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240434" data-name="Arrow-trending-up">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240434;32872:19523" data-name="heroicons-micro/arrow-trending-up">
                        <div className="absolute h-[8.496px] left-px top-[3.5px] w-[13.397px]" data-node-id="I1097:240434;32872:19523;1643:10" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke1} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240435">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">+1,2%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240436">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240439" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240439;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240439;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240440">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start justify-center min-w-px px-[16px] relative self-stretch" data-node-id="1097:240441">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240444" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240444;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240444;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240444;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`4 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">High rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240445" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240445;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240445;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240445;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`10 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Low rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240446" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240446;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240446;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240446;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`15 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Unpriced</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240447" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240447;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240447;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240447;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">0</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Arithmetical errors`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240448" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240448;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240448;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240448;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`12 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Excluded/ By others / By client</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240449">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240452" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240452;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240452;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240452;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240462" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240463">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240464" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240466">
                        <p className="leading-[16px]">Crestline Advisory Partners</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240470">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240473">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240474">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240477">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240478">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240481" data-name="Arrow-trending-up">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240481;32872:19523" data-name="heroicons-micro/arrow-trending-up">
                        <div className="absolute h-[8.496px] left-px top-[3.5px] w-[13.397px]" data-node-id="I1097:240481;32872:19523;1643:10" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke1} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240482">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">+1,2%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240483">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240486" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240486;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240486;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240487">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start justify-center min-w-px px-[16px] relative self-stretch" data-node-id="1097:240488">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240491" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240491;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240491;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240491;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`8 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">High rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240492" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240492;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240492;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240492;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">5</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Low rates`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240493" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240493;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240493;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240493;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">7</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Unpriced`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240494" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240494;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240494;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240494;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`1 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Arithmetical errors</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240495" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240495;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240495;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240495;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`0 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Excluded/ By others / By client</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240496">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240499" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240499;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240499;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240499;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[#e2edf7] border-solid border-t content-stretch flex items-start py-[16px] relative shrink-0 w-full" data-node-id="1097:240509" data-name="RecentTenderRow">
                  <div className="content-stretch flex flex-col items-start justify-center pr-[8px] py-[8px] relative self-stretch shrink-0 w-[120px]" data-node-id="1097:240510">
                    <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1097:240511" data-name="Bidder 2">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1097:240513">
                        <p className="leading-[16px]">Axis Structural Engineers GmbH</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240517">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240520">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0 w-[168px]" data-node-id="1097:240521">
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240524">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">AED 463,455,725</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[152px]" data-node-id="1097:240525">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240528" data-name="Arrow-trending-up">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240528;32872:19523" data-name="heroicons-micro/arrow-trending-up">
                        <div className="absolute h-[8.496px] left-px top-[3.5px] w-[13.397px]" data-node-id="I1097:240528;32872:19523;1643:10" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke1} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240529">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">+1,2%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[4px] items-center relative self-stretch shrink-0 w-[143px]" data-node-id="1097:240530">
                    <div className="relative shrink-0 size-[16px]" data-node-id="1097:240533" data-name="Arrow-trending-down">
                      <div className="absolute inset-0 overflow-clip" data-node-id="I1097:240533;32568:1686" data-name="heroicons-micro/arrow-trending-down">
                        <div className="absolute h-[9.473px] left-px top-[4px] w-[13.765px]" data-node-id="I1097:240533;32568:1686;1643:8" data-name="Vector (Stroke)">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorStroke} />
                        </div>
                      </div>
                    </div>
                    <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#262626] text-[14px] text-ellipsis whitespace-nowrap" data-node-id="1097:240534">
                      <p className="leading-[24px] overflow-hidden text-ellipsis">-0,1%</p>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start justify-center min-w-px px-[16px] relative self-stretch" data-node-id="1097:240535">
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240538" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240538;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240538;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240538;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`1 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">High rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240539" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240539;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240539;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240539;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`14 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Low rates</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240540" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240540;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240540;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240540;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">9</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">{` Unpriced`}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240541" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240541;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240541;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240541;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`4 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Arithmetical errors</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#faebd3] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1097:240542" data-name="Pill / small w/icon">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1097:240542;33322:3876">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1097:240542;33322:3878">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[0px] text-black whitespace-nowrap" data-node-id="I1097:240542;33322:3879">
                            <p className="text-[12px]">
                              <span className="leading-[16px]">{`0 `}</span>
                              <span className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic">Excluded/ By others / By client</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[8px] items-center relative self-stretch shrink-0" data-node-id="1097:240543">
                    <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1097:240546" data-name="Button">
                      <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1097:240546;32544:2137" data-name="Eye">
                        <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1097:240546;32544:2137;32568:1817" data-name="Vector">
                          <div className="absolute inset-[-5%_-3.74%]">
                            <img alt="" className="block max-w-none size-full" src={imgVector3} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1097:240546;32542:371">
                        View
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
