; ZAX lowered .asm trace
; range: $0100..$200A (end exclusive)

; func byte_glob_glob begin
byte_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_idx_word)         ; 010B: 2A 00 00
push HL                        ; 010E: E5
pop HL                         ; 010F: E1
push HL                        ; 0110: E5
ld HL, glob_bytes              ; 0111: 21 00 00
pop DE                         ; 0114: D1
add HL, DE                     ; 0115: 19
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
ld A, (hl)                     ; 0118: 7E
push AF                        ; 0119: F5
ld HL, (glob_idx_word)         ; 011A: 2A 00 00
push HL                        ; 011D: E5
pop HL                         ; 011E: E1
push HL                        ; 011F: E5
ld HL, glob_bytes              ; 0120: 21 00 00
pop DE                         ; 0123: D1
add HL, DE                     ; 0124: 19
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
ld (hl), A                     ; 0127: 77
pop AF                         ; 0128: F1
ld H, $0000                    ; 0129: 26 00
ld L, A                        ; 012B: 6F
__zax_epilogue_0:
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func byte_glob_glob end
; func main begin
main:
push IX                        ; 0134: DD E5
ld IX, $0000                   ; 0136: DD 21 00 00
add IX, SP                     ; 013A: DD 39
push AF                        ; 013C: F5
push BC                        ; 013D: C5
push DE                        ; 013E: D5
push HL                        ; 013F: E5
call byte_glob_glob            ; 0140: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0143: E1
pop DE                         ; 0144: D1
pop BC                         ; 0145: C1
pop AF                         ; 0146: F1
ld SP, IX                      ; 0147: DD F9
pop IX                         ; 0149: DD E1
ret                            ; 014B: C9
; func main end

; symbols:
; label byte_glob_glob = $0100
; label __zax_epilogue_0 = $012C
; label main = $0134
; label __zax_epilogue_1 = $0143
; data glob_bytes = $2000
; data glob_idx_word = $2008
