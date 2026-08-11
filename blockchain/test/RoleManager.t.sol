// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";

contract RoleManagerTest is Test {

    RoleManager public roleManager;

    // Creation of dummy addresses to simulate the various actors described in the thesis
    address public admin = address(this); // The test contract itself will act as the admin
    address public brandIssuer = address(0x1);
    address public serviceCentre = address(0x2);
    address public dealerBoutique = address(0x3);
    address public unauthorizedUser = address(0x4);

    function setUp() public {
        // This function is executed before each individual test
        roleManager = new RoleManager();
    }

    function test_ConstructorAssignsAdminRole() public view {
        // Verify that the admin actually holds the DEFAULT_ADMIN_ROLE
        assertTrue(roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_AdminCanGrantIssuerRole() public {
        // The admin grants the role
        roleManager.grantIssuerRole(brandIssuer);

        // Verify that the brandIssuer now holds the ISSUER_ROLE
        assertTrue(roleManager.hasRole(roleManager.ISSUER_ROLE(), brandIssuer));
    }

    function test_AdminCanGrantDealerRole() public {
        // The admin grants the role
        roleManager.grantDealerRole(dealerBoutique);

        // Verify that the dealerBoutique now holds the DEALER_ROLE
        assertTrue(roleManager.hasRole(roleManager.DEALER_ROLE(), dealerBoutique));
    }

    function test_AdminCanGrantServiceRole() public {
        // The admin grants the role
        roleManager.grantServiceRole(serviceCentre);

        // Verify that the serviceCentre now holds the SERVICE_ROLE
        assertTrue(roleManager.hasRole(roleManager.SERVICE_ROLE(), serviceCentre));
    }

    function test_RevertWhen_UnauthorizedUserGrantsRole() public {
        // vm.prank tells Foundry: "The next transaction will be sent by unauthorizedUser"
        vm.prank(unauthorizedUser);
        
        // vm.expectRevert tells Foundry: "I expect the next transaction to revert (fail)"
        vm.expectRevert();
        
        // The unauthorized user tries to grant a role (and it must fail)
        roleManager.grantIssuerRole(brandIssuer);

        // Test identical verification for the Dealer Role
        vm.prank(unauthorizedUser);
        vm.expectRevert();
        roleManager.grantDealerRole(dealerBoutique);
    }
}