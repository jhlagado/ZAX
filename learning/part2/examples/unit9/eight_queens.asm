; ZAX lowered .asm trace
; range: $0100..$80C7 (end exclusive)

; func place_row begin
place_row:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
ld HL, $0000                   ; 0109: 21 00 00
ex (SP), HL                    ; 010C: E3
push HL                        ; 010D: E5
ld HL, $0000                   ; 010E: 21 00 00
ex (SP), HL                    ; 0111: E3
push HL                        ; 0112: E5
ld HL, $0000                   ; 0113: 21 00 00
ex (SP), HL                    ; 0116: E3
push AF                        ; 0117: F5
push BC                        ; 0118: C5
push DE                        ; 0119: D5
push HL                        ; 011A: E5
ld A, (found_solution)         ; 011B: 3A 00 00
or A                           ; 011E: B7
jp z, __zax_if_else_1          ; 011F: CA 00 00
jp __zax_epilogue_0            ; 0122: C3 00 00
__zax_if_else_1:
ld A, (ix+$04)                 ; 0125: DD 7E 04
cp BoardSize                   ; 0128: FE 08
jp nz, __zax_if_else_3         ; 012A: C2 00 00
ld A, $0001                    ; 012D: 3E 01
ld (found_solution), A         ; 012F: 32 00 00
jp __zax_epilogue_0            ; 0132: C3 00 00
__zax_if_else_3:
ld A, $0000                    ; 0135: 3E 00
ld (ix-$02), A                 ; 0137: DD 77 FE
ld A, $0001                    ; 013A: 3E 01
or A                           ; 013C: B7
__zax_while_cond_5:
jp z, __zax_while_end_6        ; 013D: CA 00 00
ld A, (ix-$02)                 ; 0140: DD 7E FE
cp BoardSize                   ; 0143: FE 08
jp c, __zax_if_else_7          ; 0145: DA 00 00
jp __zax_while_end_6           ; 0148: C3 00 00
__zax_if_else_7:
ld A, (ix+$04)                 ; 014B: DD 7E 04
ld B, (ix-$02)                 ; 014E: DD 46 FE
add A, B                       ; 0151: 80
ld (ix-$04), A                 ; 0152: DD 77 FC
ld A, (ix+$04)                 ; 0155: DD 7E 04
add A, DiagBias                ; 0158: C6 07
ld B, (ix-$02)                 ; 015A: DD 46 FE
sub B                          ; 015D: 90
ld (ix-$06), A                 ; 015E: DD 77 FA
ex DE, HL                      ; 0161: EB
ld E, (IX - $0002)             ; 0162: DD 5E FE
ex DE, HL                      ; 0165: EB
push DE                        ; 0166: D5
push HL                        ; 0167: E5
ld de, col_used                ; 0168: 11 00 00
ld H, $0000                    ; 016B: 26 00
ld L, L                        ; 016D: 6D
add HL, DE                     ; 016E: 19
ld A, (HL)                     ; 016F: 7E
pop HL                         ; 0170: E1
pop DE                         ; 0171: D1
or A                           ; 0172: B7
jp z, __zax_if_else_9          ; 0173: CA 00 00
push DE                        ; 0176: D5
ld E, (IX - $0002)             ; 0177: DD 5E FE
inc E                          ; 017A: 1C
ld (IX - $0002), E             ; 017B: DD 73 FE
pop DE                         ; 017E: D1
ld A, $0001                    ; 017F: 3E 01
or A                           ; 0181: B7
jp __zax_while_cond_5          ; 0182: C3 00 00
__zax_if_else_9:
ex DE, HL                      ; 0185: EB
ld E, (IX - $0004)             ; 0186: DD 5E FC
ex DE, HL                      ; 0189: EB
push DE                        ; 018A: D5
push HL                        ; 018B: E5
ld de, diag_sum_used           ; 018C: 11 00 00
ld H, $0000                    ; 018F: 26 00
ld L, L                        ; 0191: 6D
add HL, DE                     ; 0192: 19
ld A, (HL)                     ; 0193: 7E
pop HL                         ; 0194: E1
pop DE                         ; 0195: D1
or A                           ; 0196: B7
jp z, __zax_if_else_11         ; 0197: CA 00 00
push DE                        ; 019A: D5
ld E, (IX - $0002)             ; 019B: DD 5E FE
inc E                          ; 019E: 1C
ld (IX - $0002), E             ; 019F: DD 73 FE
pop DE                         ; 01A2: D1
ld A, $0001                    ; 01A3: 3E 01
or A                           ; 01A5: B7
jp __zax_while_cond_5          ; 01A6: C3 00 00
__zax_if_else_11:
ex DE, HL                      ; 01A9: EB
ld E, (IX - $0006)             ; 01AA: DD 5E FA
ex DE, HL                      ; 01AD: EB
push DE                        ; 01AE: D5
push HL                        ; 01AF: E5
ld de, diag_diff_used          ; 01B0: 11 00 00
ld H, $0000                    ; 01B3: 26 00
ld L, L                        ; 01B5: 6D
add HL, DE                     ; 01B6: 19
ld A, (HL)                     ; 01B7: 7E
pop HL                         ; 01B8: E1
pop DE                         ; 01B9: D1
or A                           ; 01BA: B7
jp z, __zax_if_else_13         ; 01BB: CA 00 00
push DE                        ; 01BE: D5
ld E, (IX - $0002)             ; 01BF: DD 5E FE
inc E                          ; 01C2: 1C
ld (IX - $0002), E             ; 01C3: DD 73 FE
pop DE                         ; 01C6: D1
ld A, $0001                    ; 01C7: 3E 01
or A                           ; 01C9: B7
jp __zax_while_cond_5          ; 01CA: C3 00 00
__zax_if_else_13:
ex DE, HL                      ; 01CD: EB
ld E, (IX + $0004)             ; 01CE: DD 5E 04
ex DE, HL                      ; 01D1: EB
ld A, (ix-$02)                 ; 01D2: DD 7E FE
push DE                        ; 01D5: D5
push HL                        ; 01D6: E5
ld de, queen_cols              ; 01D7: 11 00 00
ld H, $0000                    ; 01DA: 26 00
ld L, L                        ; 01DC: 6D
add HL, DE                     ; 01DD: 19
ld (HL), A                     ; 01DE: 77
pop HL                         ; 01DF: E1
pop DE                         ; 01E0: D1
ex DE, HL                      ; 01E1: EB
ld E, (IX - $0002)             ; 01E2: DD 5E FE
ex DE, HL                      ; 01E5: EB
ld A, $0001                    ; 01E6: 3E 01
push DE                        ; 01E8: D5
push HL                        ; 01E9: E5
ld de, col_used                ; 01EA: 11 00 00
ld H, $0000                    ; 01ED: 26 00
ld L, L                        ; 01EF: 6D
add HL, DE                     ; 01F0: 19
ld (HL), A                     ; 01F1: 77
pop HL                         ; 01F2: E1
pop DE                         ; 01F3: D1
ex DE, HL                      ; 01F4: EB
ld E, (IX - $0004)             ; 01F5: DD 5E FC
ex DE, HL                      ; 01F8: EB
push DE                        ; 01F9: D5
push HL                        ; 01FA: E5
ld de, diag_sum_used           ; 01FB: 11 00 00
ld H, $0000                    ; 01FE: 26 00
ld L, L                        ; 0200: 6D
add HL, DE                     ; 0201: 19
ld (HL), A                     ; 0202: 77
pop HL                         ; 0203: E1
pop DE                         ; 0204: D1
ex DE, HL                      ; 0205: EB
ld E, (IX - $0006)             ; 0206: DD 5E FA
ex DE, HL                      ; 0209: EB
push DE                        ; 020A: D5
push HL                        ; 020B: E5
ld de, diag_diff_used          ; 020C: 11 00 00
ld H, $0000                    ; 020F: 26 00
ld L, L                        ; 0211: 6D
add HL, DE                     ; 0212: 19
ld (HL), A                     ; 0213: 77
pop HL                         ; 0214: E1
pop DE                         ; 0215: D1
ld A, (ix+$04)                 ; 0216: DD 7E 04
inc A                          ; 0219: 3C
ld H, $0000                    ; 021A: 26 00
ld L, A                        ; 021C: 6F
push HL                        ; 021D: E5
call place_row                 ; 021E: CD 00 00
inc SP                         ; 0221: 33
inc SP                         ; 0222: 33
ld A, (found_solution)         ; 0223: 3A 00 00
or A                           ; 0226: B7
jp z, __zax_if_else_15         ; 0227: CA 00 00
jp __zax_while_end_6           ; 022A: C3 00 00
__zax_if_else_15:
ex DE, HL                      ; 022D: EB
ld E, (IX - $0002)             ; 022E: DD 5E FE
ex DE, HL                      ; 0231: EB
ld A, $0000                    ; 0232: 3E 00
push DE                        ; 0234: D5
push HL                        ; 0235: E5
ld de, col_used                ; 0236: 11 00 00
ld H, $0000                    ; 0239: 26 00
ld L, L                        ; 023B: 6D
add HL, DE                     ; 023C: 19
ld (HL), A                     ; 023D: 77
pop HL                         ; 023E: E1
pop DE                         ; 023F: D1
ex DE, HL                      ; 0240: EB
ld E, (IX - $0004)             ; 0241: DD 5E FC
ex DE, HL                      ; 0244: EB
push DE                        ; 0245: D5
push HL                        ; 0246: E5
ld de, diag_sum_used           ; 0247: 11 00 00
ld H, $0000                    ; 024A: 26 00
ld L, L                        ; 024C: 6D
add HL, DE                     ; 024D: 19
ld (HL), A                     ; 024E: 77
pop HL                         ; 024F: E1
pop DE                         ; 0250: D1
ex DE, HL                      ; 0251: EB
ld E, (IX - $0006)             ; 0252: DD 5E FA
ex DE, HL                      ; 0255: EB
push DE                        ; 0256: D5
push HL                        ; 0257: E5
ld de, diag_diff_used          ; 0258: 11 00 00
ld H, $0000                    ; 025B: 26 00
ld L, L                        ; 025D: 6D
add HL, DE                     ; 025E: 19
ld (HL), A                     ; 025F: 77
pop HL                         ; 0260: E1
pop DE                         ; 0261: D1
push DE                        ; 0262: D5
ld E, (IX - $0002)             ; 0263: DD 5E FE
inc E                          ; 0266: 1C
ld (IX - $0002), E             ; 0267: DD 73 FE
pop DE                         ; 026A: D1
ld A, $0001                    ; 026B: 3E 01
or A                           ; 026D: B7
jp __zax_while_cond_5          ; 026E: C3 00 00
__zax_epilogue_0:
__zax_while_end_6:
pop HL                         ; 0271: E1
pop DE                         ; 0272: D1
pop BC                         ; 0273: C1
pop AF                         ; 0274: F1
ld SP, IX                      ; 0275: DD F9
pop IX                         ; 0277: DD E1
ret                            ; 0279: C9
; func main begin
; func place_row end
main:
push IX                        ; 027A: DD E5
ld IX, $0000                   ; 027C: DD 21 00 00
add IX, SP                     ; 0280: DD 39
push AF                        ; 0282: F5
push BC                        ; 0283: C5
push DE                        ; 0284: D5
push HL                        ; 0285: E5
ld A, $0000                    ; 0286: 3E 00
ld (found_solution), A         ; 0288: 32 00 00
ld HL, $0000                   ; 028B: 21 00 00
push HL                        ; 028E: E5
call place_row                 ; 028F: CD 00 00
inc SP                         ; 0292: 33
inc SP                         ; 0293: 33
__zax_epilogue_17:
pop HL                         ; 0294: E1
pop DE                         ; 0295: D1
pop BC                         ; 0296: C1
pop AF                         ; 0297: F1
ld SP, IX                      ; 0298: DD F9
pop IX                         ; 029A: DD E1
ret                            ; 029C: C9
; func main end

; symbols:
; label place_row = $0100
; label __zax_if_else_1 = $0125
; label __zax_if_else_3 = $0135
; label __zax_while_cond_5 = $013D
; label __zax_if_else_7 = $014B
; label __zax_if_else_9 = $0185
; label __zax_if_else_11 = $01A9
; label __zax_if_else_13 = $01CD
; label __zax_if_else_15 = $022D
; label __zax_epilogue_0 = $0271
; label __zax_while_end_6 = $0271
; label main = $027A
; label __zax_epilogue_17 = $0294
; data queen_cols = $8000
; data col_used = $8008
; data diag_sum_used = $8010
; data diag_diff_used = $801F
; data found_solution = $802E
; label __zax_startup = $802F
; constant BoardSize = $0008 (8)
; constant DiagBias = $0007 (7)
; constant LastColumn = $0007 (7)
; constant LastRow = $0007 (7)
