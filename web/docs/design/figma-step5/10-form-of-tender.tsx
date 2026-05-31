const imgUnion = "https://www.figma.com/api/mcp/asset/2d18fecc-1c15-4ad7-9342-2aae6116a4fb";
const imgOval = "https://www.figma.com/api/mcp/asset/407bc3f0-ec23-45aa-904d-3909888e1e2f";
const imgVector1Stroke = "https://www.figma.com/api/mcp/asset/67cd7def-7ce6-4e48-a657-b0031f0461c0";
const imgVector = "https://www.figma.com/api/mcp/asset/f72d8239-0983-4b1c-b15e-75d5e274e44f";
const imgVector1 = "https://www.figma.com/api/mcp/asset/ef016e38-8b44-4bae-b063-b05b622d2438";
const imgVector2 = "https://www.figma.com/api/mcp/asset/14504edf-776e-46e9-a7b5-9f43e4031123";
const imgVector3 = "https://www.figma.com/api/mcp/asset/6391c31d-5752-4f2a-be2a-7cf440b4f169";
const imgVector4 = "https://www.figma.com/api/mcp/asset/c5c60b5d-ccb3-4cbd-874f-a2c1f72f750a";

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
    <div className="content-stretch flex flex-col items-start relative size-full" data-node-id="1502:87011" data-name="Compliance requirements">
      <div className="content-stretch flex flex-col items-center relative rounded-[16px] shrink-0 w-full" data-node-id="1502:87012">
        <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87013">
          <div className="bg-white content-stretch flex flex-[1_0_0] flex-col gap-[48px] items-start min-w-px relative rounded-[16px] self-stretch" data-node-id="1502:87014" data-name="Project Identity">
            <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-node-id="1502:87015">
              <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="1502:87016">
                <div className="content-stretch flex h-[32px] items-center relative shrink-0 w-full" data-node-id="1502:87017">
                  <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="1502:87018">
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="1502:87019">
                      <div className="bg-[#142845] content-stretch flex h-[24px] items-center justify-center px-[16px] relative rounded-[30px] shrink-0 w-[40px]" data-node-id="1502:87020" data-name="Badge & Pill - Number Badge">
                        <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87020;32633:5123">
                          <div className="[word-break:break-word] flex flex-col font-['Inter:Medium'] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-center text-white whitespace-nowrap" data-node-id="I1502:87020;32633:5124">
                            <p className="leading-[16px]">A</p>
                          </div>
                        </div>
                      </div>
                      <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#141414] text-[18px] whitespace-nowrap" data-node-id="1502:87021">
                        <p className="leading-[24px]">FORM OF TENDER</p>
                      </div>
                    </div>
                    <ButtonIconSquares className="content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" />
                  </div>
                </div>
                <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87023">
                  <div className="[word-break:break-word] flex flex-col font-['Inter:Light'] font-light justify-center leading-[0] not-italic relative shrink-0 text-[#142845] text-[12px] w-[680px]" data-node-id="1502:87024">
                    <p className="leading-[16px]">{`Review the submitted Form of Tender for completeness, signatures, acknowledged addenda, and compliance with the tender submission requirements. Five mandatory criteria that determine compliance status. All 5 compliance criteria's must be met in order to be considered fully compliant.`}</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87025" data-name="Input fields">
                <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
                  <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] h-full items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87026">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87027">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87028">
                        <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87029" data-name="Button - Icon Squares">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87029;33269:9079" data-name="Clipboard document list">
                            <div className="absolute inset-[9.38%_15.63%]" data-node-id="I1502:87029;33269:9079;33364:7910" data-name="Vector">
                              <div className="absolute inset-[-3.85%_-4.55%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87030">
                          <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87031">
                            <p className="leading-[24px]">FOT Submission</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87032">
                        <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1502:87033">
                          <p className="leading-[16px]">Form of Tender document submitted with tender.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
                  <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] h-full items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87036">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87037">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87038">
                        <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87039" data-name="Button - Icon Squares">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87039;33269:9079" data-name="Clock">
                            <div className="absolute inset-[12.5%]" data-node-id="I1502:87039;33269:9079;32568:1755" data-name="Vector">
                              <div className="absolute inset-[-4.17%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector1} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87040">
                          <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87041">
                            <p className="leading-[24px]">Time for Completion</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87042">
                        <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[0px] text-black" data-node-id="1502:87043">
                          <p className="text-[12px]">
                            <span className="leading-[16px]">{`Programme duration matches tender requirements: `}</span>
                            <span className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[16px] not-italic">1000 days</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87046">
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87047">
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87048">
                      <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87049" data-name="Button - Icon Squares">
                        <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87049;33269:9079" data-name="Percentage-badge">
                          <div className="absolute inset-[12.47%_12.54%_12.53%_12.46%]" data-node-id="I1502:87049;33269:9079;32545:5623" data-name="Vector">
                            <div className="absolute inset-[-4.17%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector2} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87050">
                        <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87051">
                          <p className="leading-[24px]">OHP Percentage</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87052">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[0px] text-black" data-node-id="1502:87053">
                        <p className="text-[12px]">
                          <span className="leading-[16px]">{`Overheads and profit matches tender requirement: `}</span>
                          <span className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[16px] not-italic">≤ 5%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-[1_0_0] flex-row items-center self-stretch">
                  <div className="bg-[rgba(226,237,247,0.5)] border-[0.5px] border-[rgba(226,237,247,0.5)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[16px] h-full items-start min-w-px p-[16px] relative rounded-[8px]" data-node-id="1502:87056">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87057">
                      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="1502:87058">
                        <div className="bg-white content-stretch drop-shadow-[1px_1px_100px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-node-id="1502:87059" data-name="Button - Icon Squares">
                          <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87059;33269:9079" data-name="Calendar-days">
                            <div className="absolute inset-[12.5%]" data-node-id="I1502:87059;33269:9079;32564:1779" data-name="Vector">
                              <div className="absolute inset-[-4.17%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector3} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="1502:87060">
                          <div className="[word-break:break-word] col-1 flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center ml-0 mt-0 not-italic relative row-1 text-[14px] text-black whitespace-nowrap" data-node-id="1502:87061">
                            <p className="leading-[24px]">Tender Validity</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex items-center justify-center pl-[48px] relative shrink-0 w-full" data-node-id="1502:87062">
                        <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Light'] font-light justify-center leading-[0] min-w-px not-italic relative text-[0px] text-black" data-node-id="1502:87063">
                          <p className="text-[12px]">
                            <span className="leading-[16px]">{`Period tender remains valid for acceptance: `}</span>
                            <span className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[16px] not-italic">≥ 90 days</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="1502:87066" data-name="Project Identity">
              <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87067" data-name="Tender rankings table">
                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="1502:87068" data-name="Recent Projects">
                  <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative rounded-[16px]" data-node-id="1502:87069" data-name="Card-dashboard">
                    <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-tl-[8px] rounded-tr-[8px] shrink-0 w-full" data-node-id="1502:87070" data-name="Table">
                      <div className="content-stretch flex items-start relative shrink-0 w-full" data-node-id="1502:87071">
                        <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-center min-w-px relative" data-node-id="1502:87072">
                          <div className="content-stretch flex gap-[16px] items-center pb-[8px] pr-[8px] relative shrink-0 w-full" data-node-id="1502:87073" data-name="Activity table labels">
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[184px]" data-node-id="1502:87087" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87087;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87087;32923:28129">
                                  <p className="leading-[16px]">Tenderer</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87087;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87087;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87087;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[112px]" data-node-id="1502:87088" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87088;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87088;32923:28129">
                                  <p className="leading-[16px]">FOT</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87088;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87088;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87088;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[140px]" data-node-id="1502:87089" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87089;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87089;32923:28129">
                                  <p className="leading-[16px]">Time for Completion</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87089;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87089;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87089;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[80px]" data-node-id="1502:87090" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87090;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87090;32923:28129">
                                  <p className="leading-[16px]">OHP %</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87090;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87090;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87090;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[160px]" data-node-id="1502:87091" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87091;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87091;32923:28129">
                                  <p className="leading-[16px]">Tender Validity</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87091;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87091;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87091;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative" data-node-id="1502:87092" data-name="Table - Table Label">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87092;32923:28128" data-name="text">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87092;32923:28129">
                                  <p className="leading-[16px]">QS Comment</p>
                                </div>
                              </div>
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87092;32923:33563">
                                <div className="overflow-clip relative shrink-0 size-[16px]" data-node-id="I1502:87092;32923:28130" data-name="Chevron-up-down">
                                  <div className="absolute inset-[14.06%_31.25%]" data-node-id="I1502:87092;32923:28130;32568:1765" data-name="Vector">
                                    <div className="absolute inset-[-0.43%_-0.83%]">
                                      <img alt="" className="block max-w-none size-full" src={imgVector4} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[rgba(226,237,247,0.5)] content-stretch flex flex-col h-[24px] items-center justify-center px-[16px] relative rounded-tl-[8px] shrink-0 w-[160px]" data-node-id="1502:87093">
                          <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-full" data-node-id="1502:87094" data-name="Table - Table Label">
                            <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87094;32923:28128" data-name="text">
                              <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold'] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#434343] text-[12px] whitespace-nowrap" data-node-id="I1502:87094;32923:28129">
                                <p className="leading-[16px]">Include in PTC?</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-[#e2edf7] border-solid border-t content-stretch flex gap-[16px] items-center py-[16px] relative shrink-0 w-full" data-node-id="1502:87095" data-name="RecentTenderRow">
                        <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-[184px]" data-node-id="1502:87096">
                          <div className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[50px] shrink-0 w-full" data-node-id="1502:87097" data-name="Bidder 2">
                            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[12px] text-black" data-node-id="1502:87099">
                              <p className="leading-[16px]">Orion Property Group</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-[112px]" data-node-id="1502:87103">
                          <div className="bg-[#c8e5d5] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87106" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87106;32778:6190">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87106;32778:5652">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87106;32778:5653">
                                  <p className="leading-[16px]">Submitted</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[140px]" data-node-id="1502:87107">
                          <div className="bg-[#f8ccd7] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87110" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87110;33322:3876">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87110;33322:3878">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87110;33322:3879">
                                  <p className="leading-[16px]">Not stated</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-[64px]" data-node-id="1502:87111">
                          <div className="bg-[#c8e5d5] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87114" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87114;33322:3876">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87114;33322:3878">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87114;33322:3879">
                                  <p className="leading-[16px]">5% OHP</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px pl-[16px] relative" data-node-id="1502:87115">
                          <div className="bg-[#c8e5d5] content-stretch flex h-[24px] items-center justify-center px-[8px] relative rounded-[8px] shrink-0" data-node-id="1502:87118" data-name="Pill / small w/icon">
                            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1502:87118;33322:3876">
                              <div className="content-stretch flex items-center relative shrink-0" data-node-id="I1502:87118;33322:3878">
                                <div className="[word-break:break-word] flex flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap" data-node-id="I1502:87118;33322:3879">
                                  <p className="leading-[16px]">90 days</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-[411.5px]" data-node-id="1502:87119" data-name="Form - Input">
                          <div className="content-stretch flex flex-col gap-[8px] h-[72px] items-start relative shrink-0 w-full" data-node-id="1502:87120" data-name="Input Top Element">
                            <div className="bg-white border border-[#d9d9d9] border-solid content-stretch flex flex-[1_0_0] gap-[8px] items-start justify-center min-h-px px-[16px] py-[8px] relative rounded-[16px] w-full" data-node-id="1502:87124" data-name="Container">
                              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="1502:87126" data-name="Text + Blink">
                                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[24px] min-w-px not-italic relative text-[#262626] text-[14px]" data-node-id="1502:87127">
                                  Programme duration must matches tender requirements: 1000 days.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex gap-[8px] items-center px-[16px] relative shrink-0 w-[160px]" data-node-id="1502:87132">
                          <FormToggleSwitch className="bg-[#c4c4c4] content-stretch flex items-center justify-end overflow-clip p-[4px] relative rounded-[13px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)] shrink-0 w-[48px]" state="Disabled" />
                          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Inter:Regular'] font-normal justify-center leading-[0] min-w-px not-italic relative text-[#262626] text-[14px]" data-node-id="1502:87136">
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
