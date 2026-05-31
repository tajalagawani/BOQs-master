const imgUnion = "https://www.figma.com/api/mcp/asset/1d2a4657-f5cb-4db5-83ae-1e04d5bc6fbc";
const imgOval = "https://www.figma.com/api/mcp/asset/57dcdf60-b350-4e25-9139-cab8c4292667";
const imgVector = "https://www.figma.com/api/mcp/asset/7be1c366-a597-4ba6-8f42-48b6eefd3a1d";
const imgVector1Stroke = "https://www.figma.com/api/mcp/asset/957f3465-4f7c-474c-a128-21dd11bf3dcb";
const imgVector1 = "https://www.figma.com/api/mcp/asset/c0bcc5f3-8452-4718-9f09-c1b4777f58fe";
const imgVector2 = "https://www.figma.com/api/mcp/asset/032dc22e-8770-4531-8fb0-4f77b49d9521";
const imgVector3 = "https://www.figma.com/api/mcp/asset/6dd7f259-1ada-46b0-8452-397b55bba701";
const imgVector4 = "https://www.figma.com/api/mcp/asset/6a6dec0f-59d2-40bc-bbe3-4f482c582e52";

type LockClosedProps = {
  className?: string;
  size?: "16px";
  variant?: "heroicons-micro";
};

function LockClosed({ className, size = "16px", variant = "heroicons-micro" }: LockClosedProps) {
  return (
    <div className={className || "overflow-clip relative size-[16px]"} data-node-id="1:7083">
      <div className="absolute h-[14px] left-[3px] top-px w-[10px]" data-node-id="1:7084" data-name="Union">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUnion} />
      </div>
    </div>
  );
}

type FormToggleSwitchProps = {
  className?: string;
  state?: "Default" | "Disabled";
  type?: boolean;
};

function FormToggleSwitch({ className, state = "Default", type = true }: FormToggleSwitchProps) {
  const isDisabledAndTrue = state === "Disabled" && type;
  return (
    <div className={className || `content-stretch flex items-center justify-end overflow-clip p-[4px] relative rounded-[13px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)] w-[48px] ${isDisabledAndTrue ? "bg-[#c4c4c4]" : "bg-[#2a69b9]"}`} id={isDisabledAndTrue ? "node-682_55595" : "node-682_55593"}>
      <div className="relative shrink-0 size-[16px]" id={isDisabledAndTrue ? "node-682_55601" : "node-682_55599"} data-name="Oval">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgOval} />
      </div>
    </div>
  );
}

type SparklesProps = {
  className?: string;
  size?: "16px";
  variant?: "heroicons-outline";
};

function Sparkles({ className, size = "16px", variant = "heroicons-outline" }: SparklesProps) {
  return (
    <div className={className || "overflow-clip relative size-[16px]"} data-node-id="26:2676">
      <div className="absolute inset-[9.38%]" data-node-id="26:2680" data-name="Vector">
        <div className="absolute inset-[-3.85%]">
          <img alt="" className="block max-w-none size-full" src={imgVector} />
        </div>
      </div>
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

export default function ComplianceRequirements() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-node-id="1502:87318" data-name="Compliance requirements">
      <div className="content-stretch flex flex-col items-center relative rounded-[16px] shrink-0 w-full" data-node-id="1502:87319">
        <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87320">
          <div className="bg-white content-stretch flex flex-[1_0_0] flex-col gap-[48px] items-start min-w-px relative rounded-[16px] self-stretch" data-node-id="1502:87321" data-name="Project Identity">
            <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-node-id="1502:87322">
              <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="1502:87323">
                <div className="content-stretch flex h-[32px] items-center relative shrink-0 w-full" data-node-id="1502:87324">
                  <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="1502:87325">
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="1502:87326">
                      <div className="bg-[#142845] content-stretch flex h-[24px] items-center justify-center px-[16px] relative rounded-[30px] shrink-0 w-[40px]" data-node-id="1502:87327" data-name="Badge & Pill - Number Badge">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87327;32633:5123">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Medium'] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-center text-white whitespace-nowrap" data-node-id="I1502:87327;32633:5124">
                            <p className="leading-[16px]">B</p>
                          </div>
                        </div>
                      </div>
                      <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#141414] text-[18px] whitespace-nowrap" data-node-id="1502:87328">
                        <p className="leading-[24px]">TERMS AND CONDITIONS</p>
                      </div>
                    </div>
                    <ButtonIconSquares className="content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" />
                  </div>
                </div>
                <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87330">
                  <div className="[word-break:break-word] flex flex-col font-['Inter:Light'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[#142845] text-[12px] w-[680px]" data-node-id="1502:87331">
                    <p className="leading-[16px] mb-0">Review the submitted Form of Tender for completeness, signatures, acknowledged addenda, and compliance with the tender submission requirements.</p>
                    <p className="leading-[16px]">Five mandatory criteria that determine compliance status. All 5 compliance criterias must be met in order to be considered fully compliant.</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87332" data-name="Input fields">
                <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
                  <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] h-full items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87333">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87334">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87335">
                        <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87336" data-name="Button - Icon Squares">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87336;33269:9079" data-name="Clipboard document list">
                            <div className="absolute inset-[9.38%_15.63%]" data-node-id="I1502:87336;33269:9079;33364:7910" data-name="Vector">
                              <div className="absolute inset-[-3.85%_-4.55%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector1} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87337">
                          <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87338">
                            <p className="leading-[24px]">Terms and Conditions</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87339">
                        <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[0px] text-black" data-node-id="1502:87340">
                          <p className="text-[12px]">
                            <span className="leading-[16px]">{`Tenderer must comply with: `}</span>
                            <span className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[16px] not-italic">(link to terms and conditions)</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
                  <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] h-full items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87343">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87344">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87345">
                        <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87346" data-name="Button - Icon Squares">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87346;33269:9079" data-name="Credit-card">
                            <div className="absolute inset-[18.75%_9.38%]" data-node-id="I1502:87346;33269:9079;32558:4804" data-name="Vector">
                              <div className="absolute inset-[-5%_-3.85%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector2} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87347">
                          <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87348">
                            <p className="leading-[24px]">Payment Terms</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87349">
                        <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[0px] text-black" data-node-id="1502:87350">
                          <p className="text-[12px]">
                            <span className="leading-[16px]">{`Tenderer must comply with: `}</span>
                            <span className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[16px] not-italic">(link to payment terms)</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87353" data-name="Project Identity">
              <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87354" data-name="Tender rankings table">
                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="1502:87355" data-name="Recent Projects">
                  <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative rounded-[16px]" data-node-id="1502:87356" data-name="Card-dashboard">
                    <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-tl-[8px] rounded-tr-[8px] shrink-0 w-full" data-node-id="1502:87357" data-name="Table">
                      <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87358">
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative" data-node-id="1502:87359">
                          <div className="content-stretch flex gap-[16px] items-center pb-[8px] pr-[8px] relative shrink-0 w-full" data-node-id="1502:87360" data-name="Activity table labels">
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[184px]" data-node-id="1502:87374" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87374;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87374;32923:28129">
                                  <p className="leading-[16px]">Tenderer</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87374;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87374;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87374;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector3} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[144px]" data-node-id="1502:87375" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87375;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87375;32923:28129">
                                  <p className="leading-[16px]">Terms and Conditions</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87375;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87375;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87375;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector3} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[380px]" data-node-id="1502:87376" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87376;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87376;32923:28129">
                                  <p className="leading-[16px]">Payment terms</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87376;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87376;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87376;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector3} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[511px]" data-node-id="1502:87377" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87377;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87377;32923:28129">
                                  <p className="leading-[16px]">QS Comment</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87377;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87377;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87377;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector3} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[rgba(226,237,247,0.5)] content-stretch flex flex-col h-[24px] items-center justify-center px-[16px] relative rounded-tl-[8px] shrink-0 w-[160px]" data-node-id="1502:87378">
                          <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-full" data-node-id="1502:87379" data-name="Table - Table Label">
                            <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87379;32923:28128" data-name="text">
                              <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87379;32923:28129">
                                <p className="leading-[16px]">Include in PTC?</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-[#e2edf7] border-solid border-t content-stretch flex gap-[16px] items-center py-[16px] relative shrink-0 w-full" data-node-id="1502:87380" data-name="RecentTenderRow">
                        <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-[184px]" data-node-id="1502:87381">
                          <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1502:87382" data-name="Bidder 2">
                            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1502:87384">
                              <p className="leading-[16px]">Orion Property Group</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-[143px]" data-node-id="1502:87388">
                          <div className="bg-[#c8e5d5] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87391" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87391;32778:6190">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87391;32778:5652">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87391;32778:5653">
                                  <p className="leading-[16px]">Compliant</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[381px]" data-node-id="1502:87392">
                          <div className="bg-[#f8ccd7] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87395" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87395;33322:3876">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87395;33322:3878">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87395;33322:3879">
                                  <p className="leading-[16px]">Non compliant</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-node-id="1502:87396">
                          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87397" data-name="Form - Input">
                            <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-node-id="1502:87398" data-name="Input Top Element">
                              <div className="bg-white border border-[#d9d9d9] border-solid content-stretch flex gap-[8px] items-start px-[16px] py-[8px] relative rounded-[16px] shrink-0 w-full" data-node-id="1502:87399" data-name="Container">
                                <div className="content-stretch flex items-start relative self-stretch shrink-0" data-node-id="1502:87401">
                                  <Sparkles className="overflow-clip relative shrink-0 size-[16px]" />
                                </div>
                                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="1502:87403" data-name="Text + Blink">
                                  <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[24px] min-w-px not-italic relative text-[#262626] text-[14px]" data-node-id="1502:87404">
                                    Section K: Commercial and Contractual Deviations.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border border-[#142845] border-solid content-stretch flex gap-[8px] h-[24px] items-center justify-center px-[16px] py-[8px] relative rounded-[16px] shrink-0" data-node-id="1502:87409" data-name="Button">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87409;32544:2137" data-name="Eye">
                            <div className="absolute inset-[18.75%_8.27%]" data-node-id="I1502:87409;32544:2137;32568:1817" data-name="Vector">
                              <div className="absolute inset-[-5%_-3.74%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector4} />
                              </div>
                            </div>
                          </div>
                          <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[16px] not-italic relative shrink-0 text-[#142845] text-[12px] whitespace-nowrap" data-node-id="I1502:87409;32542:371">
                            View
                          </p>
                        </div>
                        <div className="content-stretch flex gap-[8px] items-center px-[16px] relative shrink-0 w-[160px]" data-node-id="1502:87410">
                          <FormToggleSwitch className="bg-[#c4c4c4] content-stretch flex items-center justify-end overflow-clip p-[4px] relative rounded-[13px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)] shrink-0 w-[48px]" state="Disabled" />
                          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[#262626] text-[14px]" data-node-id="1502:87414">
                            <p className="leading-[24px]">Yes</p>
                          </div>
                          <LockClosed className="overflow-clip relative shrink-0 size-[16px]" />
                        </div>
                      </div>
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
