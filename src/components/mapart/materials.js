import React, { Component } from "react";

import Tooltip from "../tooltip";

import BlockImage from "./blockImage";

import "./materials.css";

class Materials extends Component {
  state = { onlyMaxPerSplit: false,
            chunksToDisplay: [],
            allMaterials: true,
          };
  
  rowInput = 0;
  columnInput = 0;
  alphaColorIdx = 61;

  onOnlyMaxPerSplitChange = () => {
    this.setState((currentState) => ({
      // nb this method of passing currentState instead of using this.state... is prefered; TODO neaten up controller uses
      onlyMaxPerSplit: !currentState.onlyMaxPerSplit,
    }));
  };

  onDisplayAllChange = () => {
    this.setState((currentState) => ({
      allMaterials: !currentState.allMaterials,
    }));
  };

  onResetList = () => {
    this.setState((currentState) => ({
      chunksToDisplay: [],
    }));
  }

  onAddChunkToList = () => {
    const { chunksToDisplay } = this.state;
    let chunkCoords = { row: this.rowInput, column: this.columnInput };
    let updatedChunksToDisplay = chunksToDisplay;
    if(!this.chunkExists(chunkCoords)) {
      chunksToDisplay.push(chunkCoords);
    }
    this.setState((currentState) => ({
      chunksToDisplay: updatedChunksToDisplay,
    }));
  }

  onRowChanged = (e) => {
    this.rowInput=parseInt(e.target.value);
  }

  onColumnChanged = (e) => {
    this.columnInput=parseInt(e.target.value);
  }

  chunkExists(newChunkCoords) {
  const { chunksToDisplay } = this.state;
    for (const existingChunkCoords of chunksToDisplay) {
      if((existingChunkCoords.row === newChunkCoords.row) && (existingChunkCoords.column === newChunkCoords.column)) {
        return true;
      }
    }
    return false;
  }

  displayChunkMaterials = () => {   
    const { chunksToDisplay } = this.state;
    let materialsTotal = this.getNewMaterialsList();
    for (const chunkCoords of chunksToDisplay) {
      this.addChunk(materialsTotal, chunkCoords.row, chunkCoords.column);
    }
    return materialsTotal;
  }

  displayAllMaterials = () => {
    const { currentMaterialsData } = this.props;
    let materialsTotal = this.getNewMaterialsList();
    let curRow = 0, curCol = 0;
    for (const rowOfChunks of currentMaterialsData.chunks) {
      curRow++;
      for (const chunk of rowOfChunks) {
        curCol++;
        this.addChunk(materialsTotal, curRow, curCol);
      }
      curCol = 0;
    }
    return materialsTotal;
  }

  addChunk (destination, row, col) {
    const { currentMaterialsData } = this.props;
    let rowNum = 0, colNum = 0;
    for (const rowOfChunks of currentMaterialsData.chunks) {
      if(++rowNum !== row) continue;
      for (const chunk of rowOfChunks) {
        if(++colNum !== col) continue;
        this.addSupportBlockCount(destination, chunk);
        this.addMaterialsCount(destination, chunk);
      }
      colNum = 0;
    }
  }

  addSupportBlockCount(destination, chunk) {
    const { onlyMaxPerSplit } = this.state;
    if (onlyMaxPerSplit) {
      destination.supportBlockCount = Math.max(destination.supportBlockCount, chunk.supportBlockCount);
    } 
    else {
      destination.supportBlockCount += chunk.supportBlockCount;
    }
  }

  addMaterialsCount(destination, chunk) {
    const { onlyMaxPerSplit } = this.state;
    for (const [colourSetId, materialCount] of Object.entries(chunk.materials)) {
      if (onlyMaxPerSplit) {
        destination.materials[colourSetId] = Math.max(destination.materials[colourSetId], materialCount);
      } 
      else {
        if(colourSetId != this.alphaColorIdx) {
          destination.materials[colourSetId] += materialCount;
        }
      }
    }
  }

  //Sorting is a prettier output, but player feedback is that they organize their storage around the static mats
  //list because it is a predictable order. Sorting actually makes them do more work to gather mats from storage. 
  getSortedNonZeroMaterials(materialsList) {
    return Object.entries(materialsList)
      .filter(([_, value]) => value !== 0)
//      .sort((first, second) => {
//       return second[1] - first[1];
//    });
  }

  getNewMaterialsList() {
    const { coloursJSON } = this.props;
    let newMaterialsList = { materials: {}, supportBlockCount: 0 };
    for (const colourSetId of Object.keys(coloursJSON)) {
      newMaterialsList.materials[colourSetId] = 0;
    }
    return newMaterialsList;
  }

  formatMaterialCount = (count) => {
    const numberOfStacks = Math.floor(count / 64);
    const remainder = count % 64;
    const numberOfShulkers = count / 1728;
    return `${count.toString()}${
      numberOfStacks !== 0
        ? ` (${numberOfStacks.toString()}x64${remainder !== 0 ? ` + ${remainder.toString()}` : ""}${
            numberOfShulkers >= 1 ? `, ${numberOfShulkers.toFixed(2)} SB` : ""
          })`
        : ""
    }`;
  };

  colourSetIdAndBlockIdFromNBTName(blockName) {
    const { coloursJSON, optionValue_version } = this.props;
    for (const [colourSetId, colourSet] of Object.entries(coloursJSON)) {
      for (const [blockId, block] of Object.entries(colourSet.blocks)) {
        if (!(optionValue_version.MCVersion in block.validVersions)) {
          continue;
        }
        let blockNBTData = block.validVersions[optionValue_version.MCVersion];
        if (typeof blockNBTData === "string") {
          // this is of the form eg "&1.12.2"
          blockNBTData = block.validVersions[blockNBTData.slice(1)];
        }
        if (
          Object.keys(blockNBTData.NBTArgs).length === 0 && // no exotic blocks for noobline
          blockName.toLowerCase() === blockNBTData.NBTName.toLowerCase()
        ) {
          return { colourSetId, blockId };
        }
      }
    }
    return null; // if block not found
  }

  render() {
    const { getLocaleString, coloursJSON, optionValue_supportBlock, currentMaterialsData } = this.props;
    const { onlyMaxPerSplit, allMaterials} = this.state;
    let materialsToDisplay = {};
    if(allMaterials) {
      materialsToDisplay = this.displayAllMaterials();
    }
    else {
      materialsToDisplay = this.displayChunkMaterials();
    }

    const nonZeroMaterialsItems = this.getSortedNonZeroMaterials(materialsToDisplay.materials);
    const supportBlockCount = materialsToDisplay.supportBlockCount;
    const supportBlockIds = this.colourSetIdAndBlockIdFromNBTName(optionValue_supportBlock);
    return (
      <div className="section materialsDiv">
        <h2>{getLocaleString("MATERIALS/TITLE")}</h2>
        <Tooltip tooltipText={getLocaleString("MATERIALS/SHOW-PER-SPLIT-TT")}>
          <b>
            {getLocaleString("MATERIALS/SHOW-PER-SPLIT")}
            {":"}
          </b>
        </Tooltip>{" "}
        <input type="checkbox" checked={onlyMaxPerSplit} onChange={this.onOnlyMaxPerSplitChange} />
        <br />
        <b>
        {getLocaleString("MATERIALS/CHUNKMATS-DISPLAYALL-CHECK")} {":"}
        </b>
        <input type="checkbox" checked={allMaterials} onChange={this.onDisplayAllChange} />
        <br />
        <Tooltip tooltipText={getLocaleString("MATERIALS/CHUNKMATS-TT")}>
          <b>
            {getLocaleString("MATERIALS/CHUNKMATS")}
            {":"}
          </b>
        </Tooltip>{" "}
        <br />
        {getLocaleString("MATERIALS/CHUNKMATS-ROWS")}{" "}
        <input type="text" class="chunkCoordsInput" name="rowVal" onChange={this.onRowChanged}/>
        {getLocaleString("MATERIALS/CHUNKMATS-COLUMNS")}{" "}
        <input type="text" class="chunkCoordsInput" name="colVal" onChange={this.onColumnChanged}/>
        <br />
        <button onClick={this.onResetList}>{getLocaleString("MATERIALS/CHUNKMATS-RESET")}</button>
        <button onClick={this.onAddChunkToList}>{getLocaleString("MATERIALS/CHUNKMATS-ADD")}</button>
        <br />
        <table id="materialtable">
          <tbody>
            <tr>
              <th>{getLocaleString("MATERIALS/BLOCK")}</th>
              <th>{getLocaleString("MATERIALS/AMOUNT")}</th>
            </tr>
            {supportBlockCount !== 0 && (
              <tr>
                <th>
                  <Tooltip tooltipText={getLocaleString("MATERIALS/PLACEHOLDER-BLOCK-TT")}>
                    <BlockImage
                      getLocaleString={getLocaleString}
                      coloursJSON={coloursJSON}
                      colourSetId={supportBlockIds === null ? "64" : supportBlockIds.colourSetId}
                      blockId={supportBlockIds === null ? "2" : supportBlockIds.blockId}
                    />
                  </Tooltip>
                </th>
                <th>{this.formatMaterialCount(supportBlockCount)}</th>
              </tr>
            )}
            {nonZeroMaterialsItems.map(([colourSetId, materialCount]) => {
              const blockId = currentMaterialsData.currentSelectedBlocks[colourSetId];
              return (
                <tr key={colourSetId}>
                  <th>
                    <Tooltip tooltipText={coloursJSON[colourSetId].blocks[blockId].displayName}>
                      <BlockImage coloursJSON={coloursJSON} colourSetId={colourSetId} blockId={blockId} />
                    </Tooltip>
                  </th>
                  <th>{this.formatMaterialCount(materialCount)}</th>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default Materials;
