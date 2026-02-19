; ZAX lowered .asm trace
; range: $0100..$0197 (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ex DE, HL                      ; 010C: EB
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ex DE, HL                      ; 0113: EB
pop DE                         ; 0114: D1
ld E, (IX + $0006)             ; 0115: DD 5E 06
ld D, (IX + $0007)             ; 0118: DD 56 07
add HL, DE                     ; 011B: 19
__zax_epilogue_0:
pop DE                         ; 011C: D1
pop BC                         ; 011D: C1
pop AF                         ; 011E: F1
ld SP, IX                      ; 011F: DD F9
pop IX                         ; 0121: DD E1
ret                            ; 0123: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0124: DD E5
ld IX, $0000                   ; 0126: DD 21 00 00
add IX, SP                     ; 012A: DD 39
ld HL, $0000                   ; 012C: 21 00 00
push HL                        ; 012F: E5
push AF                        ; 0130: F5
push BC                        ; 0131: C5
push DE                        ; 0132: D5
push IX                        ; 0133: DD E5
pop HL                         ; 0135: E1
push DE                        ; 0136: D5
ld DE, $0004                   ; 0137: 11 04 00
add HL, DE                     ; 013A: 19
pop DE                         ; 013B: D1
ld L, (hl)                     ; 013C: 6E
ld H, $0000                    ; 013D: 26 00
inc L                          ; 013F: 2C
push DE                        ; 0140: D5
ex DE, HL                      ; 0141: EB
ld (IX - $0008), E             ; 0142: DD 73 F8
ld (IX - $0007), D             ; 0145: DD 72 F9
ex DE, HL                      ; 0148: EB
pop DE                         ; 0149: D1
push DE                        ; 014A: D5
ex DE, HL                      ; 014B: EB
ld E, (IX - $0008)             ; 014C: DD 5E F8
ld D, (IX - $0007)             ; 014F: DD 56 F9
ex DE, HL                      ; 0152: EB
pop DE                         ; 0153: D1
__zax_epilogue_1:
pop DE                         ; 0154: D1
pop BC                         ; 0155: C1
pop AF                         ; 0156: F1
ld SP, IX                      ; 0157: DD F9
pop IX                         ; 0159: DD E1
ret                            ; 015B: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 015C: DD E5
ld IX, $0000                   ; 015E: DD 21 00 00
add IX, SP                     ; 0162: DD 39
ld HL, $0000                   ; 0164: 21 00 00
push HL                        ; 0167: E5
push AF                        ; 0168: F5
push BC                        ; 0169: C5
push DE                        ; 016A: D5
push HL                        ; 016B: E5
ld HL, $0014                   ; 016C: 21 14 00
push HL                        ; 016F: E5
ld HL, $000A                   ; 0170: 21 0A 00
push HL                        ; 0173: E5
call add_words                 ; 0174: CD 00 00
inc SP                         ; 0177: 33
inc SP                         ; 0178: 33
inc SP                         ; 0179: 33
inc SP                         ; 017A: 33
push DE                        ; 017B: D5
ex DE, HL                      ; 017C: EB
ld (IX - $000A), E             ; 017D: DD 73 F6
ld (IX - $0009), D             ; 0180: DD 72 F7
ex DE, HL                      ; 0183: EB
pop DE                         ; 0184: D1
ld HL, $0007                   ; 0185: 21 07 00
push HL                        ; 0188: E5
call bump_byte                 ; 0189: CD 00 00
inc SP                         ; 018C: 33
inc SP                         ; 018D: 33
__zax_epilogue_2:
pop HL                         ; 018E: E1
pop DE                         ; 018F: D1
pop BC                         ; 0190: C1
pop AF                         ; 0191: F1
ld SP, IX                      ; 0192: DD F9
pop IX                         ; 0194: DD E1
ret                            ; 0196: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $011C
; label bump_byte = $0124
; label __zax_epilogue_1 = $0154
; label main = $015C
; label __zax_epilogue_2 = $018E
